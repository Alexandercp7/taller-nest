import { Test, TestingModule } from '@nestjs/testing';
import { BillingStatus, InvoiceStatus } from '@prisma/client';
import { RequestUser } from '@common/types/request-user.type';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';

describe('InvoicingController', () => {
  let controller: InvoicingController;
  let service: {
    getPendingQueue: jest.Mock;
    updateFiscalData: jest.Mock;
    emitInvoice: jest.Mock;
    findAllInvoices: jest.Mock;
    findOneInvoice: jest.Mock;
    cancelInvoice: jest.Mock;
  };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    service = {
      getPendingQueue: jest.fn(),
      updateFiscalData: jest.fn(),
      emitInvoice: jest.fn(),
      findAllInvoices: jest.fn(),
      findOneInvoice: jest.fn(),
      cancelInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicingController],
      providers: [{ provide: InvoicingService, useValue: service }],
    }).compile();

    controller = module.get<InvoicingController>(InvoicingController);
  });

  it('delegates getPendingQueue to service', async () => {
    service.getPendingQueue.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });

    const result = await controller.getPendingQueue({}, actor);

    expect(service.getPendingQueue).toHaveBeenCalledWith({}, actor);
    expect(result.data).toEqual([]);
  });

  it('delegates updateFiscalData to service', async () => {
    const dto = {
      rfc: 'PEPJ8001019Q8',
      businessName: 'JUAN PEREZ',
      zipCode: '03100',
      taxRegime: '612',
    };
    service.updateFiscalData.mockResolvedValue({ success: true, billingStatus: BillingStatus.LISTA_PARA_FACTURAR });

    const result = await controller.updateFiscalData('wo-1', dto, actor);

    expect(service.updateFiscalData).toHaveBeenCalledWith('wo-1', dto, actor);
    expect(result.success).toBe(true);
  });

  it('delegates emitInvoice to service', async () => {
    const dto = { notes: 'Factura interna' };
    const mockInvoice = {
      id: 'inv-1',
      invoiceNumber: 'FAC-0001',
      status: InvoiceStatus.ISSUED,
    };
    service.emitInvoice.mockResolvedValue(mockInvoice);

    const result = await controller.emitInvoice('wo-1', dto, actor);

    expect(service.emitInvoice).toHaveBeenCalledWith('wo-1', dto, actor);
    expect(result.invoiceNumber).toBe('FAC-0001');
  });

  it('delegates findAllInvoices to service', async () => {
    service.findAllInvoices.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });

    const result = await controller.findAllInvoices({}, actor);

    expect(service.findAllInvoices).toHaveBeenCalledWith({}, actor);
    expect(result.data).toEqual([]);
  });

  it('delegates findOneInvoice to service', async () => {
    const mockInvoice = { id: 'inv-1', invoiceNumber: 'FAC-0001' };
    service.findOneInvoice.mockResolvedValue(mockInvoice);

    const result = await controller.findOneInvoice('inv-1', actor);

    expect(service.findOneInvoice).toHaveBeenCalledWith('inv-1', actor);
    expect(result.id).toBe('inv-1');
  });

  it('delegates cancelInvoice to service', async () => {
    const dto = { cancellationReason: 'Error en RFC' };
    const mockCancelled = { id: 'inv-1', status: InvoiceStatus.CANCELLED };
    service.cancelInvoice.mockResolvedValue(mockCancelled);

    const result = await controller.cancelInvoice('inv-1', dto, actor);

    expect(service.cancelInvoice).toHaveBeenCalledWith('inv-1', dto, actor);
    expect(result.status).toBe(InvoiceStatus.CANCELLED);
  });
});
