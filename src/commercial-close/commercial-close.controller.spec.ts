import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RequestUser } from '@common/types/request-user.type';
import { CommercialCloseController } from './commercial-close.controller';
import { CommercialCloseService } from './commercial-close.service';

describe('CommercialCloseController', () => {
  let controller: CommercialCloseController;
  let service: {
    executeClose: jest.Mock;
    findByWorkOrder: jest.Mock;
  };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    service = {
      executeClose: jest.fn(),
      findByWorkOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommercialCloseController],
      providers: [{ provide: CommercialCloseService, useValue: service }],
    }).compile();

    controller = module.get<CommercialCloseController>(CommercialCloseController);
  });

  it('delegates executeClose to service', async () => {
    const dto = { requiresInvoice: true, notes: 'Cliente pide factura' };
    service.executeClose.mockResolvedValue({ id: 'close-1', frozenTotal: '1160.00' });

    const res = await controller.executeClose('wo-1', dto, actor);
    expect(res.id).toBe('close-1');
    expect(service.executeClose).toHaveBeenCalledWith('wo-1', dto, actor);
  });

  it('delegates findByWorkOrder to service and throws NotFoundException when null', async () => {
    service.findByWorkOrder.mockResolvedValue(null);

    await expect(controller.findByWorkOrder('wo-1', actor)).rejects.toThrow(
      NotFoundException,
    );
  });
});
