import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '@common/types/request-user.type';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;

  const prisma = {
    supplier: {
      findUnique: jest.fn(),
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

  const dto = { name: 'Refaccionaria del Norte', phone: '5512345678' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuppliersService(prisma, audit);
  });

  describe('create', () => {
    it('crea el proveedor en el workshop del actor y audita SUPPLIER_CREATED', async () => {
      (prisma.supplier.create as jest.Mock).mockResolvedValue({
        id: 'supplier-1',
        workshopId: actor.workshopId,
        name: dto.name,
        contactName: null,
        phone: dto.phone,
        email: null,
        address: null,
        isActive: true,
        createdAt: new Date(),
      });

      await service.create(dto, actor);

      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workshopId: actor.workshopId }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUPPLIER_CREATED' }),
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('filtra por workshopId del actor y por defecto excluye inactivos', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, actor);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workshopId: actor.workshopId,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('multi-tenancy: 404 si el proveedor pertenece a otro workshop', async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
      });

      await expect(
        service.update('foreign-1', { name: 'X' }, actor),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('nunca borra: solo pone isActive=false y audita SUPPLIER_DEACTIVATED', async () => {
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue({
        id: 'supplier-1',
        workshopId: actor.workshopId,
      });

      await service.deactivate('supplier-1', actor);

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        data: { isActive: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUPPLIER_DEACTIVATED' }),
        undefined,
      );
    });
  });
});
