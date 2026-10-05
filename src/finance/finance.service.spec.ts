import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementType, CashReferenceType, Prisma, ReceivableStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: {
    payment: { findMany: jest.Mock; updateMany: jest.Mock; aggregate: jest.Mock };
    accountReceivable: {
      upsert: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    cashMovement: { create: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock };
  };
  let audit: { log: jest.Mock };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      accountReceivable: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      cashMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  describe('upsertReceivableFromClose', () => {
    it('creates receivable with OPEN status when no payments exist', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.accountReceivable.upsert.mockResolvedValue({
        id: 'cxc-1',
        workshopId: 'ws-1',
        workOrderId: 'wo-1',
        clientId: 'cli-1',
        originalAmount: new Prisma.Decimal('1500.00'),
        paidAmount: new Prisma.Decimal('0.00'),
        balance: new Prisma.Decimal('1500.00'),
        status: ReceivableStatus.OPEN,
      });

      const res = await service.upsertReceivableFromClose(
        { id: 'wo-1', workshopId: 'ws-1', clientId: 'cli-1' },
        new Prisma.Decimal('1500.00'),
      );

      expect(res.status).toBe(ReceivableStatus.OPEN);
      expect(prisma.accountReceivable.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workOrderId: 'wo-1' },
          create: expect.objectContaining({
            balance: new Prisma.Decimal('1500.00'),
            status: ReceivableStatus.OPEN,
          }),
        }),
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('discounts previous advances and sets PAID status if fully covered', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', amount: new Prisma.Decimal('1500.00') },
      ]);
      prisma.accountReceivable.upsert.mockResolvedValue({
        id: 'cxc-1',
        status: ReceivableStatus.PAID,
        balance: new Prisma.Decimal('0.00'),
      });

      const res = await service.upsertReceivableFromClose(
        { id: 'wo-1', workshopId: 'ws-1', clientId: 'cli-1' },
        new Prisma.Decimal('1500.00'),
      );

      expect(res.status).toBe(ReceivableStatus.PAID);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1', accountReceivableId: null },
        data: { accountReceivableId: 'cxc-1' },
      });
    });
  });

  describe('applyPaymentToReceivable', () => {
    it('updates paidAmount, balance and transitions to PAID when settled', async () => {
      prisma.accountReceivable.findUniqueOrThrow.mockResolvedValue({
        id: 'cxc-1',
        paidAmount: new Prisma.Decimal('500.00'),
        balance: new Prisma.Decimal('500.00'),
      });
      prisma.accountReceivable.update.mockResolvedValue({
        id: 'cxc-1',
        paidAmount: new Prisma.Decimal('1000.00'),
        balance: new Prisma.Decimal('0.00'),
        status: ReceivableStatus.PAID,
      });

      const result = await service.applyPaymentToReceivable(
        'cxc-1',
        new Prisma.Decimal('500.00'),
      );

      expect(result.isFullyPaid).toBe(true);
      expect(result.newBalance.toFixed(2)).toBe('0.00');
    });

    it('throws BadRequestException if payment exceeds balance', async () => {
      prisma.accountReceivable.findUniqueOrThrow.mockResolvedValue({
        id: 'cxc-1',
        paidAmount: new Prisma.Decimal('500.00'),
        balance: new Prisma.Decimal('200.00'),
      });

      await expect(
        service.applyPaymentToReceivable('cxc-1', new Prisma.Decimal('300.00')),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCashMovement', () => {
    it('creates movement and logs audit', async () => {
      prisma.cashMovement.create.mockResolvedValue({
        id: 'mov-1',
        workshopId: 'ws-1',
        type: CashMovementType.EXPENSE,
        amount: new Prisma.Decimal('120.00'),
        concept: 'Tornillería rápida',
        referenceType: CashReferenceType.MANUAL,
        referenceId: null,
        performedById: 'user-1',
        createdAt: new Date(),
      });

      const res = await service.createCashMovement(
        {
          type: CashMovementType.EXPENSE,
          amount: '120.00',
          concept: 'Tornillería rápida',
        },
        actor,
      );

      expect(res.id).toBe('mov-1');
      expect(res.amount).toBe('120.00');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASH_MOVEMENT_CREATED',
        }),
        undefined,
      );
    });
  });
});
