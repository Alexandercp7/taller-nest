import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '@common/types/request-user.type';
import { SpecialOrderPartsService } from './special-order-parts.service';

describe('SpecialOrderPartsService', () => {
  let service: SpecialOrderPartsService;

  const prisma = {
    specialOrderPart: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;

  const actor: RequestUser = {
    id: 'actor-1',
    workshopId: 'workshop-1',
    role: 'ADMIN',
    effectivePermissions: [],
  };

  const dto = {
    sku: 'SKU-1',
    name: 'Filtro de aceite',
    unitPrice: '150.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpecialOrderPartsService(prisma, audit);
  });

  describe('create', () => {
    it('rechaza SKU duplicado en el mismo workshop', async () => {
      (prisma.specialOrderPart.findFirst as jest.Mock).mockResolvedValue({
        id: 'x',
      });
      await expect(service.create(dto, actor)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.specialOrderPart.create).not.toHaveBeenCalled();
    });

    it('crea el ítem en el workshop del actor, guarda el precio como Decimal y audita', async () => {
      (prisma.specialOrderPart.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.specialOrderPart.create as jest.Mock).mockResolvedValue({
        id: 'item-1',
        workshopId: actor.workshopId,
        sku: dto.sku,
        name: dto.name,
        description: null,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        isActive: true,
        createdAt: new Date(),
      });

      await service.create(dto, actor);

      const createCall = (prisma.specialOrderPart.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.workshopId).toBe(actor.workshopId);
      expect(createCall.data.unitPrice).toBeInstanceOf(Prisma.Decimal);
      expect(createCall.data.unitPrice.toString()).toBe('150');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SPECIAL_ORDER_PART_CREATED' }),
        undefined,
      );
    });
  });

  describe('unitPrice serializado', () => {
    it('siempre expone 2 decimales aunque el valor guardado no los tenga', async () => {
      (prisma.specialOrderPart.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        workshopId: actor.workshopId,
        sku: dto.sku,
        name: dto.name,
        description: null,
        unitPrice: new Prisma.Decimal('150'),
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.findOne('item-1', actor);
      expect(result.unitPrice).toBe('150.00');
    });
  });

  describe('findAll', () => {
    it('filtra por workshopId del actor y por defecto excluye inactivos', async () => {
      (prisma.specialOrderPart.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.specialOrderPart.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, actor);

      expect(prisma.specialOrderPart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workshopId: actor.workshopId,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('multi-tenancy: 404 si el ítem pertenece a otro workshop', async () => {
      (prisma.specialOrderPart.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
      });

      await expect(service.findOne('foreign-1', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('nunca borra: solo pone isActive=false y audita', async () => {
      (prisma.specialOrderPart.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        workshopId: actor.workshopId,
      });

      await service.deactivate('item-1', actor);

      expect(prisma.specialOrderPart.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { isActive: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SPECIAL_ORDER_PART_DEACTIVATED' }),
        undefined,
      );
    });
  });
});
