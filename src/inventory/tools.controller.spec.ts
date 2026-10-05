import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ToolCondition, ToolStatus } from '@prisma/client';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

describe('ToolsController', () => {
  let controller: ToolsController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    setPhoto: jest.fn(),
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
      controllers: [ToolsController],
      providers: [{ provide: ToolsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ToolsController>(ToolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega dto y actor', () => {
      const dto = {
        name: 'Gato hidráulico',
        condition: ToolCondition.BUENO,
        status: ToolStatus.DISPONIBLE,
      } as never;
      void controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('findAll delega query y actor', () => {
      const query = { page: 1, limit: 10 } as never;
      void controller.findAll(query, actor);
      expect(serviceMock.findAll).toHaveBeenCalledWith(query, actor);
    });

    it('findOne delega id y actor', () => {
      void controller.findOne('t1', actor);
      expect(serviceMock.findOne).toHaveBeenCalledWith('t1', actor);
    });

    it('update delega id, dto y actor', () => {
      const dto = { name: 'Gato hidráulico 3T' } as never;
      void controller.update('t1', dto, actor);
      expect(serviceMock.update).toHaveBeenCalledWith('t1', dto, actor);
    });

    it('deactivate delega id y actor', async () => {
      await controller.deactivate('t1', actor);
      expect(serviceMock.deactivate).toHaveBeenCalledWith('t1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'inventory:write'],
      ['findAll', 'inventory:read'],
      ['findOne', 'inventory:read'],
      ['update', 'inventory:write'],
      ['setPhoto', 'inventory:write'],
      ['deactivate', 'inventory:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        ToolsController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
