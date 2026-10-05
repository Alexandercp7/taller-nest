import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { ServiceCategory, VehicleType } from '@prisma/client';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('ServicesController', () => {
  let controller: ServicesController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    setPrices: jest.fn(),
    remove: jest.fn(),
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
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega dto y actor', async () => {
      const dto = {
        concept: 'Afinación',
        category: ServiceCategory.AFINACION_Y_MANTENIMIENTO,
        system: 'Motor',
      };
      await controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('findAll delega query y actor', async () => {
      const query = { page: 1, limit: 10, vehicleType: VehicleType.AUTO };
      await controller.findAll(query, actor);
      expect(serviceMock.findAll).toHaveBeenCalledWith(query, actor);
    });

    it('findOne delega id, actor y vehicleType', async () => {
      await controller.findOne('srv-1', VehicleType.CAMIONETA, actor);
      expect(serviceMock.findOne).toHaveBeenCalledWith(
        'srv-1',
        actor,
        VehicleType.CAMIONETA,
      );
    });

    it('update delega id, dto y actor', async () => {
      const dto = { concept: 'Nuevo concepto' };
      await controller.update('srv-1', dto, actor);
      expect(serviceMock.update).toHaveBeenCalledWith('srv-1', dto, actor);
    });

    it('setPrices delega id, dto y actor', async () => {
      const dto = {
        prices: [{ vehicleType: VehicleType.CAMION, price: '700.00' }],
      };
      await controller.setPrices('srv-1', dto, actor);
      expect(serviceMock.setPrices).toHaveBeenCalledWith('srv-1', dto, actor);
    });

    it('remove delega id y actor', async () => {
      await controller.remove('srv-1', actor);
      expect(serviceMock.remove).toHaveBeenCalledWith('srv-1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'service:write'],
      ['findAll', 'service:read'],
      ['findOne', 'service:read'],
      ['update', 'service:write'],
      ['setPrices', 'service:write'],
      ['remove', 'service:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        ServicesController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
