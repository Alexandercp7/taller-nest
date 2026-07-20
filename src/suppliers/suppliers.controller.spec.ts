import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
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
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: serviceMock }],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega el dto y el actor', () => {
      const dto = { name: 'Refaccionaria', phone: '5512345678' };
      void controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('deactivate delega el id y el actor (soft-delete)', async () => {
      await controller.deactivate('s1', actor);
      expect(serviceMock.deactivate).toHaveBeenCalledWith('s1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'supplier:write'],
      ['findAll', 'supplier:read'],
      ['findOne', 'supplier:read'],
      ['update', 'supplier:write'],
      ['deactivate', 'supplier:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        SuppliersController.prototype as unknown as Record<
          string,
          () => unknown
        >
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
