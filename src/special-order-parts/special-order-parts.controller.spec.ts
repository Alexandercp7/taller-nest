import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { SpecialOrderPartsController } from './special-order-parts.controller';
import { SpecialOrderPartsService } from './special-order-parts.service';

describe('SpecialOrderPartsController', () => {
  let controller: SpecialOrderPartsController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const actor: RequestUser = {
    id: 'actor-1',
    workshopId: 'workshop-1',
    role: 'ADMIN',
    effectivePermissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialOrderPartsController],
      providers: [{ provide: SpecialOrderPartsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<SpecialOrderPartsController>(
      SpecialOrderPartsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega el dto y el actor', () => {
      const dto = {
        sku: 'SKU-1',
        name: 'Filtro',
        unitPrice: '150.00',
      };
      void controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('deactivate delega el id y el actor (soft-delete)', async () => {
      await controller.deactivate('p1', actor);
      expect(serviceMock.deactivate).toHaveBeenCalledWith('p1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'special-order-part:write'],
      ['findAll', 'special-order-part:read'],
      ['findOne', 'special-order-part:read'],
      ['update', 'special-order-part:write'],
      ['deactivate', 'special-order-part:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        SpecialOrderPartsController.prototype as unknown as Record<
          string,
          () => unknown
        >
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
