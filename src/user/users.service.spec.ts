// NOTA (hallazgo QA bloqueante — ver reporte): la config de Jest en package.json
// no tiene `moduleNameMapper` para los alias de tsconfig (`@common/*`,
// `@prisma-service/*`, `@audit/*`). Sin ese mapeo, cualquier archivo que importe
// `@common/...` (como users.service.ts) revienta con
// "Cannot find module '@common/...'" al correr bajo `npm run test`.
// Mitigamos aquí con un mock "virtual" que re-exporta las clases REALES (mismas
// referencias, mismo `instanceof`) para poder probar la lógica de negocio mientras
// nest-engineer aplica el fix definitivo (moduleNameMapper en package.json#jest).
import {
  ForbiddenActionException,
  LastAdminException,
} from '../common/exceptions/domain.exceptions';

jest.mock(
  '@common/exceptions/domain.exceptions',
  () => jest.requireActual('../common/exceptions/domain.exceptions'),
  { virtual: true },
);

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/types/request-user.type';

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    userPermission: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;

  const admin: RequestUser = {
    id: 'admin-1',
    workshopId: 'workshop-1',
    role: Role.ADMIN,
    effectivePermissions: [],
  };

  const director: RequestUser = {
    id: 'director-1',
    workshopId: 'workshop-1',
    role: Role.DIRECTOR,
    effectivePermissions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma, audit);
  });

  describe('create', () => {
    const dto = {
      email: 'nuevo@taller.com',
      firstName: 'Ana',
      lastName: 'Gómez',
      password: 'password123',
      role: Role.TECHNICIAN,
    };

    it('doble defensa: rechaza si el actor no es ADMIN aunque haya pasado el guard (p.ej. DIRECTOR)', async () => {
      await expect(service.create(dto, director)).rejects.toThrow(
        ForbiddenActionException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rechaza si el email ya existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'x' });
      await expect(service.create(dto, admin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('crea el usuario en el workshop del actor y audita USER_CREATED', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-1',
        workshopId: admin.workshopId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        kpiTitle: null,
        isActive: true,
        createdAt: new Date(),
      });

      await service.create(dto, admin);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workshopId: admin.workshopId }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          actorId: admin.id,
          workshopId: admin.workshopId,
        }),
        undefined,
      );
      // La contraseña jamás debe viajar en texto plano al audit log.
      const auditCall = (audit.log as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(auditCall)).not.toContain(dto.password);
    });
  });

  describe('findAll', () => {
    it('filtra por workshopId del actor y por defecto excluye inactivos', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, admin);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workshopId: admin.workshopId,
            isActive: true,
          }),
        }),
      );
    });

    it('incluye inactivos solo si includeInactive=true', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, includeInactive: true },
        admin,
      );

      const where = (prisma.user.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.isActive).toBeUndefined();
    });
  });

  describe('update — último ADMIN activo no puede perder el rol', () => {
    it('rechaza degradar al último ADMIN activo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        workshopId: admin.workshopId,
        role: Role.ADMIN,
      });
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.update('admin-1', { role: Role.TECHNICIAN }, admin),
      ).rejects.toThrow(LastAdminException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('permite degradar un ADMIN si hay más de un ADMIN activo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-2',
        workshopId: admin.workshopId,
        role: Role.ADMIN,
        firstName: 'A',
        lastName: 'B',
      });
      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'admin-2',
        role: Role.TECHNICIAN,
        firstName: 'A',
        lastName: 'B',
      });

      await service.update('admin-2', { role: Role.TECHNICIAN }, admin);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('multi-tenancy: 404 si el usuario objetivo pertenece a otro workshop', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
        role: Role.TECHNICIAN,
      });

      await expect(
        service.update('foreign-1', { firstName: 'X' }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('audita USER_ROLE_CHANGED cuando cambia el rol, USER_UPDATED en otro caso', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        workshopId: admin.workshopId,
        role: Role.TECHNICIAN,
        firstName: 'A',
        lastName: 'B',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        role: Role.SERVICE_ADVISOR,
        firstName: 'A',
        lastName: 'B',
      });

      await service.update('tech-1', { role: Role.SERVICE_ADVISOR }, admin);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ROLE_CHANGED' }),
        undefined,
      );
    });
  });

  describe('deactivate (soft-delete)', () => {
    it('nunca borra: solo pone isActive=false', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        workshopId: admin.workshopId,
        role: Role.TECHNICIAN,
      });

      await service.deactivate('tech-1', admin);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'tech-1' },
        data: { isActive: false },
      });
    });

    it('revoca todos los refresh tokens activos del usuario al desactivarlo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        workshopId: admin.workshopId,
        role: Role.TECHNICIAN,
      });

      await service.deactivate('tech-1', admin);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'tech-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rechaza desactivar al último ADMIN activo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        workshopId: admin.workshopId,
        role: Role.ADMIN,
      });
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await expect(service.deactivate('admin-1', admin)).rejects.toThrow(
        LastAdminException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('audita USER_DEACTIVATED con before/after', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        workshopId: admin.workshopId,
        role: Role.TECHNICIAN,
      });

      await service.deactivate('tech-1', admin);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_DEACTIVATED',
          before: { isActive: true },
          after: { isActive: false },
        }),
        expect.anything(),
      );
    });

    it('multi-tenancy: 404 si el usuario objetivo pertenece a otro workshop', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
        role: Role.TECHNICIAN,
      });

      await expect(service.deactivate('foreign-1', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePermissions', () => {
    it('hace upsert por cada entrada (crea o actualiza granted)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'tech-1',
        workshopId: admin.workshopId,
      });

      await service.updatePermissions(
        'tech-1',
        { permissions: [{ permissionId: 'perm-1', granted: false }] },
        admin,
      );

      expect(prisma.userPermission.upsert).toHaveBeenCalledWith({
        where: {
          userId_permissionId: { userId: 'tech-1', permissionId: 'perm-1' },
        },
        update: { granted: false },
        create: { userId: 'tech-1', permissionId: 'perm-1', granted: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_PERMISSIONS_CHANGED' }),
        undefined,
      );
    });

    it('multi-tenancy: 404 si el usuario objetivo pertenece a otro workshop', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'foreign-1',
        workshopId: 'otro-workshop',
      });

      await expect(
        service.updatePermissions(
          'foreign-1',
          { permissions: [{ permissionId: 'perm-1', granted: true }] },
          admin,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.userPermission.upsert).not.toHaveBeenCalled();
    });
  });
});
