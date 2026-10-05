import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BillingStatus,
  CommercialStatus,
  OperationalStatus,
  Prisma,
  QuotationApprovalStatus,
  QuotationLineType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { RequestUser } from '@common/types/request-user.type';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialCloseService } from './commercial-close.service';

describe('CommercialCloseService', () => {
  let service: CommercialCloseService;
  let prisma: {
    workOrder: { findFirst: jest.Mock; update: jest.Mock };
    commercialClose: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let finance: { upsertReceivableFromClose: jest.Mock };
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
      commercialClose: { upsert: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    audit = { log: jest.fn() };
    finance = {
      upsertReceivableFromClose: jest.fn().mockResolvedValue({
        id: 'cxc-1',
        balance: new Prisma.Decimal('1160.00'),
      }),
    };
    clients = { recalculateTag: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialCloseService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: FinanceService, useValue: finance },
        { provide: ClientsService, useValue: clients },
      ],
    }).compile();

    service = module.get<CommercialCloseService>(CommercialCloseService);
  });

  describe('executeClose', () => {
    it('executes commercial close, freezes total, creates receivable and updates order', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        workshopId: 'ws-1',
        clientId: 'cli-1',
        operationalStatus: OperationalStatus.ENTREGADA,
        commercialStatus: CommercialStatus.COTIZADA,
        client: { rfc: 'XAXX010101000' },
        quotation: {
          discountType: null,
          discountValue: null,
          aplicaIva: true,
          lines: [
            {
              lineType: QuotationLineType.SERVICE,
              quantity: 1,
              finalPrice: new Prisma.Decimal('1000.00'),
              approvalStatus: QuotationApprovalStatus.APPROVED,
            },
          ],
        },
      });

      prisma.commercialClose.upsert.mockResolvedValue({
        id: 'close-1',
        workOrderId: 'wo-1',
        workshopId: 'ws-1',
        frozenTotal: new Prisma.Decimal('1160.00'),
        closedById: 'user-1',
        billingStatusResolved: BillingStatus.NO_REQUERIDA,
        notes: 'Cierre exitoso',
        createdAt: new Date(),
        closedAt: new Date(),
        closedBy: { firstName: 'Admin', lastName: 'Principal' },
      });

      const res = await service.executeClose(
        'wo-1',
        { requiresInvoice: false, notes: 'Cierre exitoso' },
        actor,
      );

      expect(res.id).toBe('close-1');
      expect(res.frozenTotal).toBe('1160.00');
      expect(res.commercialStatus).toBe(CommercialStatus.CIERRE_PENDIENTE);
      expect(finance.upsertReceivableFromClose).toHaveBeenCalledWith(
        expect.anything(),
        new Prisma.Decimal('1160.00'),
        expect.anything(),
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: expect.objectContaining({
          commercialStatus: CommercialStatus.CIERRE_PENDIENTE,
          billingStatus: BillingStatus.NO_REQUERIDA,
        }),
      });
      expect(clients.recalculateTag).toHaveBeenCalledWith('cli-1', 'user-1', expect.anything());
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMERCIAL_CLOSE_EXECUTED' }),
        expect.anything(),
      );
    });

    it('throws NotFoundException if work order is not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.executeClose('wo-404', { requiresInvoice: false }, actor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
