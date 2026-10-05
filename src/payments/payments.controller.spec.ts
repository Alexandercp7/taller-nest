import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentType } from '@prisma/client';
import { RequestUser } from '@common/types/request-user.type';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: {
    create: jest.Mock;
    findByWorkOrder: jest.Mock;
    getSummary: jest.Mock;
  };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByWorkOrder: jest.fn(),
      getSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('delegates create to service', async () => {
    const dto = {
      type: PaymentType.FINAL_SETTLEMENT,
      paymentMethod: PaymentMethod.CASH,
      amount: '500.00',
    };
    service.create.mockResolvedValue({ id: 'pay-1', ...dto });

    const res = await controller.create('wo-1', dto, actor);
    expect(res.id).toBe('pay-1');
    expect(service.create).toHaveBeenCalledWith('wo-1', dto, actor);
  });

  it('delegates findByWorkOrder to service', async () => {
    service.findByWorkOrder.mockResolvedValue([]);
    const res = await controller.findByWorkOrder('wo-1', actor);
    expect(res).toEqual([]);
    expect(service.findByWorkOrder).toHaveBeenCalledWith('wo-1', actor);
  });

  it('delegates getSummary to service', async () => {
    service.getSummary.mockResolvedValue({ totalPaid: '500.00', balance: '0.00' });
    const res = await controller.getSummary('wo-1', actor);
    expect(res.totalPaid).toBe('500.00');
    expect(service.getSummary).toHaveBeenCalledWith('wo-1', actor);
  });
});
