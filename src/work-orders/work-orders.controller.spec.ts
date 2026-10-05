import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { OperationalStatus, PhotoCategory } from '@prisma/client';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    changeOperationalStatus: jest.fn(),
    toggleDelayed: jest.fn(),
    addNote: jest.fn(),
    uploadPhoto: jest.fn(),
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
      controllers: [WorkOrdersController],
      providers: [{ provide: WorkOrdersService, useValue: serviceMock }],
    }).compile();

    controller = module.get<WorkOrdersController>(WorkOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('create delega dto y actor', async () => {
      const dto = { clientId: 'c1', vehicleId: 'v1', failureDescription: 'Falla' };
      await controller.create(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('findAll delega query y actor', async () => {
      const query = { page: 1, limit: 10 };
      await controller.findAll(query, actor);
      expect(serviceMock.findAll).toHaveBeenCalledWith(query, actor);
    });

    it('findOne delega id y actor', async () => {
      await controller.findOne('wo-1', actor);
      expect(serviceMock.findOne).toHaveBeenCalledWith('wo-1', actor);
    });

    it('changeOperationalStatus delega id, dto y actor', async () => {
      const dto = { status: OperationalStatus.EN_DIAGNOSTICO };
      await controller.changeOperationalStatus('wo-1', dto, actor);
      expect(serviceMock.changeOperationalStatus).toHaveBeenCalledWith('wo-1', dto, actor);
    });

    it('toggleDelayed delega id, flag y actor', async () => {
      await controller.toggleDelayed('wo-1', true, actor);
      expect(serviceMock.toggleDelayed).toHaveBeenCalledWith('wo-1', true, actor);
    });

    it('addNote delega id, dto y actor', async () => {
      const dto = { content: 'Nota interna' };
      await controller.addNote('wo-1', dto, actor);
      expect(serviceMock.addNote).toHaveBeenCalledWith('wo-1', dto, actor);
    });

    it('uploadPhoto delega archivo y categoría', async () => {
      const file = { originalname: 'test.jpg', buffer: Buffer.from('') } as Express.Multer.File;
      await controller.uploadPhoto('wo-1', file, PhotoCategory.RECEPTION, true, 'Frontal', actor);
      expect(serviceMock.uploadPhoto).toHaveBeenCalledWith(
        'wo-1',
        file,
        PhotoCategory.RECEPTION,
        true,
        'Frontal',
        actor,
      );
    });

    it('remove delega id y actor', async () => {
      await controller.remove('wo-1', actor);
      expect(serviceMock.remove).toHaveBeenCalledWith('wo-1', actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['create', 'work-order:write'],
      ['findAll', 'work-order:read'],
      ['findOne', 'work-order:read'],
      ['update', 'work-order:write'],
      ['changeOperationalStatus', 'work-order:status'],
      ['toggleDelayed', 'work-order:write'],
      ['addNote', 'work-order:write'],
      ['uploadPhoto', 'work-order:write'],
      ['remove', 'work-order:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        WorkOrdersController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
