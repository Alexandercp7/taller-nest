import { Test, TestingModule } from '@nestjs/testing';
import { CashMovementType, CashReferenceType, ReceivableStatus } from '@prisma/client';
import { RequestUser } from '@common/types/request-user.type';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

describe('FinanceController', () => {
  let controller: FinanceController;
  let service: {
    findAllReceivables: jest.Mock;
    findAllCashMovements: jest.Mock;
    createCashMovement: jest.Mock;
    getFinancialReport: jest.Mock;
  };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'ws-1',
    role: 'ADMIN',
    effectivePermissions: ['*'],
  };

  beforeEach(async () => {
    service = {
      findAllReceivables: jest.fn(),
      findAllCashMovements: jest.fn(),
      createCashMovement: jest.fn(),
      getFinancialReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: service }],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('delegates findAllReceivables to service', async () => {
    service.findAllReceivables.mockResolvedValue({ data: [], total: 0 });
    const res = await controller.findAllReceivables({ page: 1, limit: 10 }, actor);
    expect(res).toEqual({ data: [], total: 0 });
    expect(service.findAllReceivables).toHaveBeenCalledWith({ page: 1, limit: 10 }, actor);
  });

  it('delegates createCashMovement to service', async () => {
    const dto = {
      type: CashMovementType.INCOME,
      amount: '500.00',
      concept: 'Venta chatarra',
    };
    service.createCashMovement.mockResolvedValue({ id: 'mov-1', ...dto });

    const res = await controller.createCashMovement(dto, actor);
    expect(res.id).toBe('mov-1');
    expect(service.createCashMovement).toHaveBeenCalledWith(dto, actor);
  });

  it('delegates getFinancialReport to service', async () => {
    service.getFinancialReport.mockResolvedValue({ grossPaymentsTotal: '1000.00' });
    const res = await controller.getFinancialReport({ from: '2026-01-01' }, actor);
    expect(res.grossPaymentsTotal).toBe('1000.00');
    expect(service.getFinancialReport).toHaveBeenCalledWith({ from: '2026-01-01' }, actor);
  });
});
