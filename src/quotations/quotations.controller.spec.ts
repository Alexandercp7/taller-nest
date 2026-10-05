import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { QuotationApprovalStatus, QuotationLineType } from '@prisma/client';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

describe('QuotationsController', () => {
  let controller: QuotationsController;
  const serviceMock = {
    getQuotationByWorkOrder: jest.fn(),
    addLine: jest.fn(),
    updateLine: jest.fn(),
    overridePrice: jest.fn(),
    approveLines: jest.fn(),
    setDiscount: jest.fn(),
    removeLine: jest.fn(),
  };

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'workshop-1',
    role: 'ADMIN',
    effectivePermissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [{ provide: QuotationsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('getQuotation delega woId y actor', async () => {
      await controller.getQuotation('wo-1', actor);
      expect(serviceMock.getQuotationByWorkOrder).toHaveBeenCalledWith('wo-1', actor);
    });

    it('addLine delega woId, dto y actor', async () => {
      const dto = { lineType: QuotationLineType.SERVICE, concept: 'Afinación' };
      await controller.addLine('wo-1', dto, actor);
      expect(serviceMock.addLine).toHaveBeenCalledWith('wo-1', dto, actor);
    });

    it('updateLine delega woId, lineId, dto y actor', async () => {
      const dto = { quantity: 2 };
      await controller.updateLine('wo-1', 'line-1', dto, actor);
      expect(serviceMock.updateLine).toHaveBeenCalledWith('wo-1', 'line-1', dto, actor);
    });

    it('overridePrice delega woId, lineId, dto y actor', async () => {
      const dto = { finalPrice: '500.00', reason: 'Ajuste' };
      await controller.overridePrice('wo-1', 'line-1', dto, actor);
      expect(serviceMock.overridePrice).toHaveBeenCalledWith('wo-1', 'line-1', dto, actor);
    });

    it('approveLines delega woId, dto y actor', async () => {
      const dto = {
        decisions: [{ lineId: 'l1', status: QuotationApprovalStatus.APPROVED }],
      };
      await controller.approveLines('wo-1', dto, actor);
      expect(serviceMock.approveLines).toHaveBeenCalledWith('wo-1', dto, actor);
    });

    it('setDiscount delega woId, dto y actor', async () => {
      const dto = { discountValue: '50.00' };
      await controller.setDiscount('wo-1', dto, actor);
      expect(serviceMock.setDiscount).toHaveBeenCalledWith('wo-1', dto, actor);
    });

    it('removeLine delega woId, lineId y actor', async () => {
      await controller.removeLine('wo-1', 'line-1', actor);
      expect(serviceMock.removeLine).toHaveBeenCalledWith('wo-1', 'line-1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['getQuotation', 'quotation:read'],
      ['addLine', 'quotation:write'],
      ['updateLine', 'quotation:write'],
      ['overridePrice', 'quotation:override-price'],
      ['approveLines', 'quotation:approve'],
      ['setDiscount', 'quotation:write'],
      ['removeLine', 'quotation:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        QuotationsController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
