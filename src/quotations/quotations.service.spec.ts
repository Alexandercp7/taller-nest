import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CommercialStatus,
  DiscountType,
  OperationalStatus,
  QuotationApprovalStatus,
  QuotationLineType,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '@common/types/request-user.type';
import { QuotationsService } from './quotations.service';

describe('QuotationsService', () => {
  let service: QuotationsService;

  const prisma = {
    workOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    quotation: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    quotationLine: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    service: { findFirst: jest.fn() },
    article: { findFirst: jest.fn() },
    vehicle: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;

  const actor: RequestUser = {
    id: 'user-advisor',
    workshopId: 'workshop-1',
    role: 'SERVICE_ADVISOR',
    effectivePermissions: [],
  };

  const mockWorkOrder = {
    id: 'wo-1',
    workshopId: actor.workshopId,
    code: 'OT-0001',
    vehicleId: 'veh-1',
    commercialStatus: CommercialStatus.SIN_COTIZAR,
    operationalStatus: OperationalStatus.EN_ESPERA_COTIZACION,
  };

  const mockQuotation = {
    id: 'quot-1',
    workOrderId: 'wo-1',
    subtotal: { toString: () => '0.00' },
    discountType: null,
    discountValue: null,
    aplicaIva: true,
    taxAmount: { toString: () => '0.00' },
    total: { toString: () => '0.00' },
    clientApprovalStatus: QuotationApprovalStatus.PENDING,
    approvedAt: null,
    lines: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockLine = {
    id: 'line-1',
    quotationId: 'quot-1',
    lineType: QuotationLineType.SERVICE,
    serviceId: 'srv-1',
    articleId: null,
    concept: 'Afinación de motor',
    quantity: 1,
    unitPrice: { toString: () => '800.00' },
    finalPrice: { toString: () => '800.00' },
    priceOverrideReason: null,
    priceOverrideById: null,
    approvalStatus: QuotationApprovalStatus.PENDING,
    rejectionReason: null,
    reQuotedFromLineId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuotationsService(prisma, audit);
  });

  describe('getQuotationByWorkOrder', () => {
    it('retorna la cotización con sus líneas', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockWorkOrder);
      (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        lines: [mockLine],
      });

      const result = await service.getQuotationByWorkOrder('wo-1', actor);

      expect(result.id).toBe('quot-1');
      expect(result.lines).toHaveLength(1);
    });

    it('lanza NotFoundException si la orden no existe en el taller', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getQuotationByWorkOrder('non-existent', actor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addLine', () => {
    it('agrega una línea de servicio, recalcula y avanza estado comercial a COTIZADA', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockWorkOrder);
      (prisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({
        id: 'srv-1',
        concept: 'Afinación de motor',
        basePrice: { toString: () => '800.00' },
        prices: [],
      });
      (prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ id: 'veh-1' });
      (prisma.quotationLine.create as jest.Mock).mockResolvedValue(mockLine);
      (prisma.quotation.update as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        subtotal: { toString: () => '800.00' },
        total: { toString: () => '928.00' },
      });

      const result = await service.addLine(
        'wo-1',
        {
          lineType: QuotationLineType.SERVICE,
          serviceId: 'srv-1',
        },
        actor,
      );

      expect(prisma.quotationLine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quotationId: 'quot-1',
            lineType: QuotationLineType.SERVICE,
            concept: 'Afinación de motor',
            finalPrice: '800.00',
          }),
        }),
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: expect.objectContaining({ commercialStatus: CommercialStatus.COTIZADA }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'QUOTATION_LINE_ADDED' }),
        undefined,
      );
      expect(result.concept).toBe('Afinación de motor');
    });
  });

  describe('overridePrice', () => {
    it('ajusta el precio final con motivo y audita', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockWorkOrder);
      (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        lines: [mockLine],
      });
      (prisma.quotationLine.update as jest.Mock).mockResolvedValue({
        ...mockLine,
        finalPrice: { toString: () => '750.00' },
        priceOverrideReason: 'Descuento cliente frecuente',
        priceOverrideById: actor.id,
      });

      const result = await service.overridePrice(
        'wo-1',
        'line-1',
        { finalPrice: '750.00', reason: 'Descuento cliente frecuente' },
        actor,
      );

      expect(result.finalPrice).toBe('750.00');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'QUOTATION_PRICE_OVERRIDDEN' }),
        undefined,
      );
    });

    it('rechaza ajuste si el actor es TECHNICIAN', async () => {
      const techActor: RequestUser = {
        ...actor,
        role: Role.TECHNICIAN,
      };

      await expect(
        service.overridePrice(
          'wo-1',
          'line-1',
          { finalPrice: '750.00', reason: 'Ajuste' },
          techActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveLines', () => {
    it('registra aprobaciones por línea y actualiza estado comercial a APROBADA_TOTAL', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockWorkOrder);
      (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        lines: [mockLine],
      });
      (prisma.quotationLine.update as jest.Mock).mockResolvedValue({
        ...mockLine,
        approvalStatus: QuotationApprovalStatus.APPROVED,
      });
      (prisma.quotation.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        lines: [
          {
            ...mockLine,
            approvalStatus: QuotationApprovalStatus.APPROVED,
          },
        ],
      });
      (prisma.quotation.update as jest.Mock).mockResolvedValue({
        ...mockQuotation,
        clientApprovalStatus: QuotationApprovalStatus.APPROVED,
        lines: [
          {
            ...mockLine,
            approvalStatus: QuotationApprovalStatus.APPROVED,
          },
        ],
      });

      const result = await service.approveLines(
        'wo-1',
        {
          decisions: [
            { lineId: 'line-1', status: QuotationApprovalStatus.APPROVED },
          ],
        },
        actor,
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: { commercialStatus: CommercialStatus.APROBADA_TOTAL },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'QUOTATION_APPROVAL_REGISTERED' }),
        undefined,
      );
      expect(result.clientApprovalStatus).toBe(QuotationApprovalStatus.APPROVED);
    });
  });
});
