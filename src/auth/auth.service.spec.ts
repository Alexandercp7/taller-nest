import { UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

// Invariantes de docs/auth.md y docs/testing.md cubiertas aquí:
// - Login genérico: usuario inexistente/inactivo/password incorrecta -> mismo 401.
// - Refresh: rotación por familia; reuse de un hash ya rotado revoca TODA la familia.
// - Logout idempotente.
// - Cambio de contraseña: revoca todas las sesiones y audita dentro de la (posible) tx.

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : undefined,
    ),
  } as unknown as PrismaService;

  const tokenService = {
    generateRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    hashToken: jest.fn(),
  } as unknown as TokenService;

  const audit = {
    log: jest.fn(),
  } as unknown as AuditService;

  const baseUser = {
    id: 'user-1',
    workshopId: 'workshop-1',
    email: 'tecnico@taller.com',
    passwordHash: 'hashed-password',
    role: 'TECHNICIAN',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, tokenService, audit);
  });

  describe('login', () => {
    const dto = { email: baseUser.email, password: 'Sup3rSecret!' };

    it('rechaza con 401 genérico si el usuario no existe (no enumera correos)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Credenciales inválidas.',
      );
    });

    it('rechaza con el MISMO 401 genérico si el usuario existe pero está inactivo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Credenciales inválidas.',
      );
    });

    it('rechaza con el MISMO 401 genérico si la contraseña es incorrecta', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Credenciales inválidas.',
      );
    });

    it('en éxito: crea un RefreshToken con familyId nuevo y devuelve access+refresh', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      (tokenService.generateRefreshToken as jest.Mock).mockReturnValue({
        raw: 'raw-refresh',
        hash: 'hashed-refresh',
        expiresAt: new Date(Date.now() + 1000),
      });
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue(
        'access-token',
      );

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'raw-refresh',
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: baseUser.id,
          tokenHash: 'hashed-refresh',
        }),
      });
      // El accessToken incluye la familyId de la sesión recién creada.
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: baseUser.id,
          role: baseUser.role,
          workshopId: baseUser.workshopId,
          familyId: expect.any(String),
        }),
      );
    });
  });

  describe('refresh (rotación por familia)', () => {
    const RAW = 'raw-refresh-token';

    it('401 si la firma del refresh token es inválida', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    });

    it('401 si no hay ningún token activo en la familia (revocada o inexistente)', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: 'user-1',
        familyId: 'family-1',
      });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
    });

    it('REUSE: hash entrante distinto al activo -> revoca TODA la familia y 401', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: 'user-1',
        familyId: 'family-1',
      });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-actual-en-bd',
        expiresAt: new Date(Date.now() + 100000),
      });
      (tokenService.hashToken as jest.Mock).mockReturnValue(
        'hash-diferente-reusado',
      );

      await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(RAW)).rejects.toThrow(
        'Reuso de token detectado. Todas las sesiones revocadas.',
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('401 y revoca el token puntual si el activo ya expiró', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: 'user-1',
        familyId: 'family-1',
      });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-actual',
        expiresAt: new Date(Date.now() - 1000),
      });
      (tokenService.hashToken as jest.Mock).mockReturnValue('hash-actual');

      await expect(service.refresh(RAW)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('éxito: revoca el actual y emite uno nuevo EN LA MISMA familyId, dentro de una transacción', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: 'user-1',
        familyId: 'family-1',
      });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-actual',
        expiresAt: new Date(Date.now() + 100000),
      });
      (tokenService.hashToken as jest.Mock).mockReturnValue('hash-actual');
      (tokenService.generateRefreshToken as jest.Mock).mockReturnValue({
        raw: 'raw-nuevo',
        hash: 'hash-nuevo',
        expiresAt: new Date(Date.now() + 200000),
      });
      (tokenService.generateAccessToken as jest.Mock).mockReturnValue(
        'nuevo-access-token',
      );
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(baseUser);
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await service.refresh(RAW);

      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'family-1',
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'nuevo-access-token',
        refreshToken: 'raw-nuevo',
      });
    });
  });

  describe('logout', () => {
    it('es idempotente: token inválido no lanza y no toca la BD', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      await expect(service.logout('token-basura')).resolves.toBeUndefined();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revoca el refresh token activo por su hash', async () => {
      (tokenService.verifyRefreshToken as jest.Mock).mockReturnValue({
        sub: 'user-1',
        familyId: 'family-1',
      });
      (tokenService.hashToken as jest.Mock).mockReturnValue('hash-a-revocar');

      await service.logout('raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'hash-a-revocar', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('changePassword', () => {
    it('401 si la contraseña actual no coincide', async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'workshop-1', {
          currentPassword: 'mala',
          newPassword: 'nueva-password-larga',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('éxito: actualiza el hash, revoca TODAS las sesiones activas del usuario y audita', async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(baseUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      jest.spyOn(argon2, 'hash').mockResolvedValue('nuevo-hash');

      await service.changePassword('user-1', 'workshop-1', {
        currentPassword: 'actual',
        newPassword: 'nueva-password-larga',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'nuevo-hash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workshopId: 'workshop-1',
          entityType: 'User',
          entityId: 'user-1',
          action: 'USER_PASSWORD_CHANGED',
          actorId: 'user-1',
        }),
        expect.anything(),
      );
    });
  });
});
