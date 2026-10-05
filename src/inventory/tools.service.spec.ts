import { NotFoundException } from '@nestjs/common';
import { ToolCondition, ToolStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { RequestUser } from '@common/types/request-user.type';
import { ToolsService } from './tools.service';

describe('ToolsService', () => {
  let service: ToolsService;

  const prisma = {
    tool: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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
    service = new ToolsService(prisma, audit, storage);
  });

  describe('create', () => {
    it('crea una herramienta correctamente y audita TOOL_CREATED', async () => {
      (prisma.tool.create as jest.Mock).mockResolvedValue({
        id: 't-1',
        workshopId: actor.workshopId,
        serialNumber: 'SN-001',
        name: 'Pistola de impacto 1/2',
        brand: 'DeWalt',
        description: null,
        condition: ToolCondition.NUEVO,
        status: ToolStatus.DISPONIBLE,
        purchasePrice: null,
        assignedToUserId: null,
        lastMaintenanceAt: null,
        notes: null,
        photoUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        {
          name: 'Pistola de impacto 1/2',
          brand: 'DeWalt',
          serialNumber: 'SN-001',
          condition: ToolCondition.NUEVO,
        },
        actor,
      );

      expect(result.id).toBe('t-1');
      expect(result.name).toBe('Pistola de impacto 1/2');
      expect(prisma.tool.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: actor.workshopId,
            name: 'Pistola de impacto 1/2',
            brand: 'DeWalt',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TOOL_CREATED' }),
        undefined,
      );
    });

    it('falla si el técnico asignado no existe o no pertenece al taller', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          {
            name: 'Escáner OBD2',
            assignedToUserId: 'user-inexistente',
          },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('devuelve lista paginada { data, total }', async () => {
      (prisma.tool.findMany as jest.Mock).mockResolvedValue([
        {
          id: 't-1',
          workshopId: actor.workshopId,
          name: 'Torquímetro 3/8',
          condition: ToolCondition.BUENO,
          status: ToolStatus.DISPONIBLE,
          isActive: true,
          createdAt: new Date(),
        },
      ]);
      (prisma.tool.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, actor);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Torquímetro 3/8');
    });
  });

  describe('deactivate', () => {
    it('desactiva la herramienta con soft-delete y audita TOOL_DEACTIVATED', async () => {
      (prisma.tool.findUnique as jest.Mock).mockResolvedValue({
        id: 't-1',
        workshopId: actor.workshopId,
        isActive: true,
      });

      await service.deactivate('t-1', actor);

      expect(prisma.tool.update).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { isActive: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TOOL_DEACTIVATED' }),
        undefined,
      );
    });
  });
});
