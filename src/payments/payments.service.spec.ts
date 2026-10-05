import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommercialStatus, PaymentMethod, PaymentType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { RequestUser } from '@common/types/request-user.type';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    workOrder: { findFirst: jest.Mock; update: jest.Mock };
    payment: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let finance: { createCashMovement: jest.Mock; applyPaymentToReceivable: jest.Mock };
  let clients: { recalculateTag: jest.Mock };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    prisma = {
      workOrder: { findFirst: jest.fn(), update: jest.fn() },
      payment: { create: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    audit = { log: jest.fn() };
    finance = {
      createCashMovement: jest.fn().mockResolvedValue({ id: 'mov-1' }),
      applyPaymentToReceivable: jest.fn().mockResolvedValue({
        newBalance: new Prisma.Decimal('0.00'),
        isFullyPaid: true,
      }),
    };
    clients = { recalculateTag: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: FinanceService, useValue: finance },
        { provide: ClientsService, useValue: clients },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create', () => {
    it('creates a final settlement payment, updates status to COBRADA_TOTAL and logs audit', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        code: 'OT-0001',
        workshopId: 'ws-1',
        clientId: 'cli-1',
        accountReceivable: {
          id: 'cxc-1',
          balance: new Prisma.Decimal('500.00'),
        },
      });

      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        workshopId: 'ws-1',
        workOrderId: 'wo-1',
        accountReceivableId: 'cxc-1',
        type: PaymentType.FINAL_SETTLEMENT,
        paymentMethod: PaymentMethod.CASH,
        amount: new Prisma.Decimal('500.00'),
        terminalCommission: new Prisma.Decimal('0.00'),
        netAmount: new Prisma.Decimal('500.00'),
        reference: null,
        notes: null,
        receivedById: 'user-1',
        cashMovementId: 'mov-1',
        createdAt: new Date(),
        receivedBy: { firstName: 'Admin', lastName: 'Principal' },
      });

      const res = await service.create(
        'wo-1',
        {
          type: PaymentType.FINAL_SETTLEMENT,
          paymentMethod: PaymentMethod.CASH,
          amount: '500.00',
        },
        actor,
      );

      expect(res.id).toBe('pay-1');
      expect(res.amount).toBe('500.00');
      expect(finance.createCashMovement).toHaveBeenCalled();
      expect(finance.applyPaymentToReceivable).toHaveBeenCalledWith(
        'cxc-1',
        new Prisma.Decimal('500.00'),
        expect.anything(),
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { commercialStatus: CommercialStatus.COBRADA_TOTAL },
      });
      expect(clients.recalculateTag).toHaveBeenCalledWith('cli-1', 'user-1', expect.anything());
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PAYMENT_REGISTERED' }),
        expect.anything(),
      );
    });

    it('throws NotFoundException if work order is not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          'wo-999',
          {
            type: PaymentType.FINAL_SETTLEMENT,
            paymentMethod: PaymentMethod.CASH,
            amount: '100.00',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('returns structured financial summary for work order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        code: 'OT-0001',
        commercialStatus: CommercialStatus.COBRADA_PARCIAL,
        quotation: { total: new Prisma.Decimal('1000.00') },
        commercialClose: { frozenTotal: new Prisma.Decimal('1000.00') },
        accountReceivable: {
          balance: new Prisma.Decimal('400.00'),
          status: 'PARTIAL',
        },
        payments: [
          {
            id: 'pay-1',
            workshopId: 'ws-1',
            workOrderId: 'wo-1',
            accountReceivableId: 'cxc-1',
            type: PaymentType.ADVANCE,
            paymentMethod: PaymentMethod.TRANSFER,
            amount: new Prisma.Decimal('600.00'),
            terminalCommission: new Prisma.Decimal('0.00'),
            netAmount: new Prisma.Decimal('600.00'),
            receivedById: 'user-1',
            createdAt: new Date(),
          },
        ],
      });

      const summary = await service.getSummary('wo-1', actor);

      expect(summary.workOrderCode).toBe('OT-0001');
      expect(summary.totalPaid).toBe('600.00');
      expect(summary.balance).toBe('400.00');
      expect(summary.receivableStatus).toBe('PARTIAL');
      expect(summary.payments).toHaveLength(1);
    });
  });
});
