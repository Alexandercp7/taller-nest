// NOTA (mismo hallazgo QA bloqueante que en users.service.spec.ts): jwt.strategy.ts
// importa `@prisma-service/prisma.service`, alias sin `moduleNameMapper` en
// package.json#jest. TypeScript conserva ese import como valor real en tiempo de
// ejecución porque `emitDecoratorMetadata` necesita el tipo del parámetro del
// constructor para `design:paramtypes` (la clase lleva @Injectable()). Se mockea
// "virtualmente" para poder instanciar JwtStrategy en el test.
jest.mock(
  '@prisma-service/prisma.service',
  () => ({ PrismaService: class {} }),
  {
    virtual: true,
  },
);

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

// Invariante crítica de docs/auth.md: `validate()` revalida `isActive` (y que la
// familia de refresh siga viva) EN CADA REQUEST; un usuario desactivado o con la
// sesión revocada no entra aunque el access token siga vigente (no expirado).

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const prisma = {
    refreshToken: { findFirst: jest.fn() },
  } as unknown as PrismaService;
  const config = {
    getOrThrow: jest.fn().mockReturnValue('access-secret-test'),
  } as unknown as ConfigService;

  const payload = {
    sub: 'user-1',
    role: 'ADMIN',
    workshopId: 'w1',
    familyId: 'f1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(config, prisma);
  });

  it('401 si no hay ningún refresh token activo para la familyId (sesión revocada: logout, reuse o cambio de password)', async () => {
    (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('401 si el usuario de la sesión está inactivo, aunque el access token no haya expirado', async () => {
    (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: Role.ADMIN,
        workshopId: 'w1',
        isActive: false,
        userPermissions: [],
      },
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('éxito: devuelve { id, role, workshopId, effectivePermissions } solo con permisos granted=true', async () => {
    (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: Role.SERVICE_ADVISOR,
        workshopId: 'w1',
        isActive: true,
        userPermissions: [
          { permission: { code: 'vehicle:create' } },
          { permission: { code: 'vehicle:read' } },
        ],
      },
    });

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: 'user-1',
      role: Role.SERVICE_ADVISOR,
      workshopId: 'w1',
      effectivePermissions: ['vehicle:create', 'vehicle:read'],
    });
  });

  it('consulta filtrando por familyId y revokedAt: null (no basta con que el usuario exista)', async () => {
    (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: Role.ADMIN,
        workshopId: 'w1',
        isActive: true,
        userPermissions: [],
      },
    });

    await strategy.validate(payload);

    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'f1', revokedAt: null },
      }),
    );
  });
});
