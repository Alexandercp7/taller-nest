import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleType, StockMovementType } from '@prisma/client';
import { REQUIRES_PERMISSION_KEY } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  const serviceMock = {
    create: jest.fn(),
    lowStock: jest.fn(),
    findAll: jest.fn(),
    findOneArticle: jest.fn(),
    kardex: jest.fn(),
    updateArticle: jest.fn(),
    setArticlePhoto: jest.fn(),
    removeArticle: jest.fn(),
    registerMovement: jest.fn(),
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
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: serviceMock }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('createArticle delega el dto y el actor', () => {
      const dto = {
        type: ArticleType.CONSUMIBLE,
        name: 'Aceite 5W-30',
        condition: 'NUEVO',
        purchasePrice: '450.00',
        salePrice: '650.00',
      } as never;
      void controller.createArticle(dto, actor);
      expect(serviceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('lowStock delega el actor', () => {
      void controller.lowStock(actor);
      expect(serviceMock.lowStock).toHaveBeenCalledWith(actor);
    });

    it('findAll delega el query y el actor', () => {
      const query = { page: 1, limit: 20 } as never;
      void controller.findAll(query, actor);
      expect(serviceMock.findAll).toHaveBeenCalledWith(query, actor);
    });

    it('findOneArticle delega el id y el actor', () => {
      void controller.findOneArticle('a1', actor);
      expect(serviceMock.findOneArticle).toHaveBeenCalledWith('a1', actor);
    });

    it('kardex delega el id, query y actor', () => {
      const query = { limit: 20 } as never;
      void controller.kardex('a1', query, actor);
      expect(serviceMock.kardex).toHaveBeenCalledWith('a1', query, actor);
    });

    it('updateArticle delega el id, dto y actor', () => {
      const dto = { name: 'Aceite 10W-40' } as never;
      void controller.updateArticle('a1', dto, actor);
      expect(serviceMock.updateArticle).toHaveBeenCalledWith('a1', dto, actor);
    });

    it('setArticlePhoto delega el id, archivo y actor', () => {
      const file = { originalname: 'foto.png' } as never;
      void controller.setArticlePhoto('a1', file, actor);
      expect(serviceMock.setArticlePhoto).toHaveBeenCalledWith(
        'a1',
        file,
        actor,
      );
    });

    it('deactiveAricle delega el id y el actor (soft-delete)', async () => {
      await controller.deactiveAricle('a1', actor);
      expect(serviceMock.removeArticle).toHaveBeenCalledWith('a1', actor);
    });

    it('createMovement delega el dto y el actor', () => {
      const dto = {
        articleId: 'a1',
        type: StockMovementType.ENTRY,
        qty: 5,
      } as never;
      void controller.createMovement(dto, actor);
      expect(serviceMock.registerMovement).toHaveBeenCalledWith(dto, actor);
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    it.each([
      ['createArticle', 'inventory:write'],
      ['lowStock', 'inventory:read'],
      ['findAll', 'inventory:read'],
      ['findOneArticle', 'inventory:read'],
      ['kardex', 'inventory:read'],
      ['updateArticle', 'inventory:write'],
      ['setArticlePhoto', 'inventory:write'],
      ['deactiveAricle', 'inventory:write'],
      ['createMovement', 'inventory:write'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        InventoryController.prototype as unknown as Record<
          string,
          () => unknown
        >
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });
  });
});
