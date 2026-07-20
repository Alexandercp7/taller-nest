import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { CustodyController } from './custody.controller';
import { CustodyService } from './custody.service';

describe('CustodyController', () => {
  let controller: CustodyController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    setPhoto: jest.fn(),
    markReturned: jest.fn(),
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
      controllers: [CustodyController],
      providers: [{ provide: CustodyService, useValue: serviceMock }],
    }).compile();

    controller = module.get<CustodyController>(CustodyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega el dto y el actor', () => {
      const dto = {
        clientId: 'c1',
        description: 'Rines originales',
        responsibleUserId: 'u1',
      } as never;
      void controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('findAll delega el query y el actor', () => {
      const query = { page: 1, limit: 20 } as never;
      void controller.findAll(query, actor);
      expect(serviceMock.findAll).toHaveBeenCalledWith(query, actor);
    });

    it('findOne delega el id y el actor', () => {
      void controller.findOne('ci1', actor);
      expect(serviceMock.findOne).toHaveBeenCalledWith('ci1', actor);
    });

    it('setPhoto delega el id, archivo y actor', () => {
      const file = { originalname: 'foto.png' } as never;
      void controller.setPhoto('ci1', file, actor);
      expect(serviceMock.setPhoto).toHaveBeenCalledWith('ci1', file, actor);
    });

    it('markReturned delega el id y el actor', () => {
      void controller.markReturned('ci1', actor);
      expect(serviceMock.markReturned).toHaveBeenCalledWith('ci1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'inventory:custody-write'],
      ['findAll', 'inventory:custody-read'],
      ['findOne', 'inventory:custody-read'],
      ['setPhoto', 'inventory:custody-write'],
      ['markReturned', 'inventory:custody-write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        CustodyController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
