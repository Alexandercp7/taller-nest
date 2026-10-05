import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BillingStatus,
  InvoiceStatus,
  Prisma,
  QuotationApprovalStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicingService } from './invoicing.service';

describe('InvoicingService', () => {
  let service: InvoicingService;
  let prisma: {
    workOrder: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    client: { update: jest.Mock };
    invoice: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
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
      workOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      client: {
        update: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    audit = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<InvoicingService>(InvoicingService);
  });

  describe('getPendingQueue', () => {
    it('returns orders diagnosed with missing fiscal fields and totals', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo-1',
          code: 'OT-001',
          billingStatus: BillingStatus.PENDIENTE_DATOS,
          client: {
            id: 'cli-1',
            name: 'Juan Perez',
            phone: '5512345678',
            email: 'juan@test.com',
            rfc: null,
            businessName: null,
            zipCode: null,
            taxRegime: null,
            cfdiUse: null,
          },
          vehicle: {
            id: 'veh-1',
            plate: 'ABC-123',
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
          },
          quotation: {
            subtotal: new Prisma.Decimal('1000.00'),
            taxAmount: new Prisma.Decimal('160.00'),
            total: new Prisma.Decimal('1160.00'),
          },
          commercialClose: {
            closedAt: new Date(),
            frozenTotal: new Prisma.Decimal('1160.00'),
          },
        },
      ]);
      prisma.workOrder.count.mockResolvedValue(1);

      const result = await service.getPendingQueue({}, actor);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].fiscalValidation.isValid).toBe(false);
      expect(result.data[0].fiscalValidation.missingFields).toContain('rfc');
      expect(result.data[0].total).toBe(1160);
    });
  });

  describe('updateFiscalData', () => {
    it('throws NotFoundException if work order is not found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateFiscalData(
          'wo-999',
          {
            rfc: 'PEPJ8001019Q8',
            businessName: 'JUAN PEREZ PEREZ',
            zipCode: '03100',
            taxRegime: '612',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if fiscal data is invalid', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        workshopId: 'ws-1',
        client: { id: 'cli-1' },
      });

      await expect(
        service.updateFiscalData(
          'wo-1',
          {
            rfc: 'INVALID_RFC',
            businessName: 'EMPRESA',
            zipCode: '123',
            taxRegime: '999',
          },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates client and advances work order to LISTA_PARA_FACTURAR when valid', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        workshopId: 'ws-1',
        clientId: 'cli-1',
        billingStatus: BillingStatus.PENDIENTE_DATOS,
        client: { id: 'cli-1' },
      });

      const result = await service.updateFiscalData(
        'wo-1',
        {
          rfc: 'PEPJ8001019Q8',
          businessName: 'JUAN PEREZ PEREZ',
          zipCode: '03100',
          taxRegime: '612',
          cfdiUse: 'G03',
          applyToClient: true,
        },
        actor,
      );

      expect(result.success).toBe(true);
      expect(result.billingStatus).toBe(BillingStatus.LISTA_PARA_FACTURAR);
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cli-1' },
          data: expect.objectContaining({
            rfc: 'PEPJ8001019Q8',
            businessName: 'JUAN PEREZ PEREZ',
          }),
        }),
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: { billingStatus: BillingStatus.LISTA_PARA_FACTURAR },
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('emitInvoice', () => {
    it('throws BadRequestException if order is not LISTA_PARA_FACTURAR', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        workshopId: 'ws-1',
        billingStatus: BillingStatus.PENDIENTE_DATOS,
        client: { id: 'cli-1' },
      });

      await expect(service.emitInvoice('wo-1', {}, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if order already has an active invoice', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        workshopId: 'ws-1',
        billingStatus: BillingStatus.LISTA_PARA_FACTURAR,
        invoice: { id: 'inv-1', invoiceNumber: 'FAC-0001', status: InvoiceStatus.ISSUED },
        client: { id: 'cli-1' },
      });

      await expect(service.emitInvoice('wo-1', {}, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('emits invoice with sequential folio FAC-0001 and items from quotation', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        code: 'OT-001',
        workshopId: 'ws-1',
        clientId: 'cli-1',
        billingStatus: BillingStatus.LISTA_PARA_FACTURAR,
        invoice: null,
        client: {
          id: 'cli-1',
          name: 'Juan Perez',
          rfc: 'PEPJ8001019Q8',
          businessName: 'JUAN PEREZ PEREZ',
          zipCode: '03100',
          taxRegime: '612',
          cfdiUse: 'G03',
        },
        quotation: {
          subtotal: new Prisma.Decimal('1000.00'),
          discountValue: new Prisma.Decimal('0.00'),
          taxAmount: new Prisma.Decimal('160.00'),
          total: new Prisma.Decimal('1160.00'),
          lines: [
            {
              id: 'line-1',
              concept: 'Cambio de Balatas Delanteras',
              quantity: 1,
              unitPrice: new Prisma.Decimal('1000.00'),
              finalPrice: new Prisma.Decimal('1000.00'),
              approvalStatus: QuotationApprovalStatus.APPROVED,
            },
          ],
        },
        commercialClose: {
          frozenTotal: new Prisma.Decimal('1160.00'),
        },
      });

      prisma.invoice.findFirst.mockResolvedValue(null); // First invoice => FAC-0001
      prisma.invoice.create.mockImplementation(({ data }) => ({
        id: 'inv-1',
        workshopId: data.workshopId,
        workOrderId: data.workOrderId,
        clientId: data.clientId,
        invoiceNumber: data.invoiceNumber,
        status: data.status,
        receiverRfc: data.receiverRfc,
        receiverName: data.receiverName,
        receiverZipCode: data.receiverZipCode,
        receiverTaxRegime: data.receiverTaxRegime,
        cfdiUse: data.cfdiUse,
        paymentMethodSat: data.paymentMethodSat,
        subtotal: new Prisma.Decimal(data.subtotal),
        discountAmount: new Prisma.Decimal(data.discountAmount),
        taxAmount: new Prisma.Decimal(data.taxAmount),
        total: new Prisma.Decimal(data.total),
        uuid: data.uuid,
        issuedById: data.issuedById,
        issuedAt: new Date(),
        createdAt: new Date(),
        items: data.items.create.map((it: any, idx: number) => ({
          id: `item-${idx + 1}`,
          ...it,
          unitPrice: new Prisma.Decimal(it.unitPrice),
          subtotal: new Prisma.Decimal(it.subtotal),
          taxAmount: new Prisma.Decimal(it.taxAmount),
          total: new Prisma.Decimal(it.total),
        })),
        workOrder: { code: 'OT-001' },
        issuedBy: { firstName: 'Admin', lastName: 'Principal' },
      }));

      const result = await service.emitInvoice('wo-1', {}, actor);

      expect(result.invoiceNumber).toBe('FAC-0001');
      expect(result.receiverRfc).toBe('PEPJ8001019Q8');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1160);
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: { billingStatus: BillingStatus.FACTURADA },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVOICE_ISSUED',
        }),
        expect.anything(),
      );
    });
  });

  describe('cancelInvoice', () => {
    it('cancels invoice and marks work order as CANCELADA', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        workshopId: 'ws-1',
        workOrderId: 'wo-1',
        status: InvoiceStatus.ISSUED,
      });

      prisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        workshopId: 'ws-1',
        workOrderId: 'wo-1',
        invoiceNumber: 'FAC-0001',
        status: InvoiceStatus.CANCELLED,
        receiverRfc: 'PEPJ8001019Q8',
        receiverName: 'JUAN PEREZ PEREZ',
        receiverZipCode: '03100',
        receiverTaxRegime: '612',
        cfdiUse: 'G03',
        paymentMethodSat: 'PUE',
        subtotal: new Prisma.Decimal('1000.00'),
        discountAmount: new Prisma.Decimal('0.00'),
        taxAmount: new Prisma.Decimal('160.00'),
        total: new Prisma.Decimal('1160.00'),
        cancellationReason: 'Error en RFC a petición del cliente',
        cancelledAt: new Date(),
        issuedById: 'user-1',
        issuedAt: new Date(),
        createdAt: new Date(),
        items: [],
        workOrder: { code: 'OT-001' },
        issuedBy: { firstName: 'Admin', lastName: 'Principal' },
        cancelledBy: { firstName: 'Admin', lastName: 'Principal' },
      });

      const result = await service.cancelInvoice(
        'inv-1',
        { cancellationReason: 'Error en RFC a petición del cliente' },
        actor,
      );

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: { billingStatus: BillingStatus.CANCELADA },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVOICE_CANCELLED',
        }),
        expect.anything(),
      );
    });

    it('throws BadRequestException if invoice is already cancelled', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        workshopId: 'ws-1',
        status: InvoiceStatus.CANCELLED,
      });

      await expect(
        service.cancelInvoice(
          'inv-1',
          { cancellationReason: 'Ya no aplica' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
