import { NotFoundException } from '@nestjs/common';
import { ArticleType, StockMovementType } from '@prisma/client';
import {
  InsufficientStockException,
  SalePriceRequiredException,
} from '@common/exceptions/domain.exceptions';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { RequestUser } from '@common/types/request-user.type';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const prisma = {
    article: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;
  const storage = {
    upload: jest.fn(),
    delete: jest.fn(),
  } as unknown as R2StorageService;

  const actor: RequestUser = {
    id: 'actor-1',
    workshopId: 'workshop-1',
    role: 'ADMIN',
    effectivePermissions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(prisma, audit, storage);
  });

  describe('create', () => {
    it('exige salePrice para PARTE_EN_VENTA', async () => {
      await expect(
        service.create(
          {
            type: ArticleType.PARTE_EN_VENTA,
            name: 'Filtro de Aceite',
          } as never,
          actor,
        ),
      ).rejects.toThrow(SalePriceRequiredException);
      expect(prisma.article.create).not.toHaveBeenCalled();
    });

    it('crea el artículo en el workshop del actor y audita ARTICLE_CREATED', async () => {
      (prisma.article.create as jest.Mock).mockResolvedValue({
        id: 'article-1',
        workshopId: actor.workshopId,
        supplierId: 'sup-1',
        sku: 'FLT-001',
        oemNumber: 'OEM-12345',
        type: ArticleType.PARTE_EN_VENTA,
        name: 'Filtro de Aceite',
        description: null,
        brand: 'Bosch',
        location: 'A-12',
        isSpecialOrder: false,
        purchasePrice: null,
        salePrice: null,
        photoUrl: null,
        stock: 0,
        minStock: 0,
        isActive: true,
        createdAt: new Date(),
      });

      await service.create(
        {
          type: ArticleType.PARTE_EN_VENTA,
          name: 'Filtro de Aceite',
          salePrice: '250.00',
          brand: 'Bosch',
          oemNumber: 'OEM-12345',
        } as never,
        actor,
      );

      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: actor.workshopId,
            brand: 'Bosch',
            oemNumber: 'OEM-12345',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ARTICLE_CREATED' }),
        undefined,
      );
    });
  });

  describe('findOneArticle', () => {
    it('multi-tenancy: 404 si el artículo pertenece a otro workshop', async () => {
      (prisma.article.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
      });

      await expect(service.findOneArticle('foreign-1', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('devuelve { data, total } paginado correctamente', async () => {
      (prisma.article.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          workshopId: actor.workshopId,
          type: ArticleType.PARTE_EN_VENTA,
          name: 'Filtro',
          stock: 10,
          minStock: 2,
          isActive: true,
          createdAt: new Date(),
        },
      ]);
      (prisma.article.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, actor);

      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: 'a1',
            name: 'Filtro',
          }),
        ],
        total: 1,
      });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.article.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workshopId: actor.workshopId }),
        }),
      );
    });
  });

  describe('lowStock', () => {
    it('solo devuelve artículos activos con stock por debajo de minStock', async () => {
      (prisma.article.findMany as jest.Mock).mockResolvedValue([
        { id: 'a1', stock: 2, minStock: 5, workshopId: actor.workshopId },
        { id: 'a2', stock: 10, minStock: 5, workshopId: actor.workshopId },
      ]);

      const result = await service.lowStock(actor);

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workshopId: actor.workshopId, isActive: true },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });
  });

  describe('registerMovement', () => {
    it('ENTRY suma al stock actual y deja before/after en el kardex', async () => {
      (prisma.article.findUnique as jest.Mock).mockResolvedValue({
        id: 'a1',
        workshopId: actor.workshopId,
        stock: 10,
      });
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({
        id: 'm1',
        articleId: 'a1',
        workOrderId: null,
        type: StockMovementType.ENTRY,
        qty: 5,
        before: 10,
        after: 15,
        reason: null,
        actorId: actor.id,
        createdAt: new Date(),
      });

      await service.registerMovement(
        { articleId: 'a1', type: StockMovementType.ENTRY, qty: 5 },
        actor,
      );

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { stock: 15 },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ before: 10, after: 15 }),
        }),
      );
    });

    it('EXIT rechaza cantidad mayor al stock disponible (409)', async () => {
      (prisma.article.findUnique as jest.Mock).mockResolvedValue({
        id: 'a1',
        workshopId: actor.workshopId,
        stock: 3,
      });

      await expect(
        service.registerMovement(
          { articleId: 'a1', type: StockMovementType.EXIT, qty: 5 },
          actor,
        ),
      ).rejects.toThrow(InsufficientStockException);
      expect(prisma.article.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('ADJUSTMENT fija el stock al valor absoluto observado', async () => {
      (prisma.article.findUnique as jest.Mock).mockResolvedValue({
        id: 'a1',
        workshopId: actor.workshopId,
        stock: 10,
      });
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({
        id: 'm1',
        articleId: 'a1',
        type: StockMovementType.ADJUSTMENT,
        qty: 7,
        before: 10,
        after: 7,
        actorId: actor.id,
        createdAt: new Date(),
      });

      await service.registerMovement(
        {
          articleId: 'a1',
          type: StockMovementType.ADJUSTMENT,
          qty: 7,
        },
        actor,
      );

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { stock: 7 },
      });
    });
  });
});
