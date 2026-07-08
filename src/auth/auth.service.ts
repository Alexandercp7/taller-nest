import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<TokenPairDto> {
    const GENERIC_401 = new UnauthorizedException('Credenciales inválidas.');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) throw GENERIC_401;

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw GENERIC_401;

    const familyId = randomUUID();
    const bundle = this.tokenService.generateRefreshToken(user.id, familyId);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: bundle.hash,
        familyId,
        expiresAt: bundle.expiresAt,
      },
    });

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      role: user.role,
      workshopId: user.workshopId,
      familyId,
    });

    return { accessToken, refreshToken: bundle.raw };
  }

  async refresh(rawToken: string): Promise<TokenPairDto> {
    const payload = this.tokenService.verifyRefreshToken(rawToken);
    if (!payload)
      throw new UnauthorizedException('Token de refresco inválido.');

    const { sub: userId, familyId } = payload;
    const incomingHash = this.tokenService.hashToken(rawToken);

    const activeToken = await this.prisma.refreshToken.findFirst({
      where: { familyId, revokedAt: null },
    });

    if (!activeToken) {
      // Familia completamente revocada o nunca existió
      throw new UnauthorizedException('Sesión expirada o revocada.');
    }

    if (activeToken.tokenHash !== incomingHash) {
      // El hash no coincide con el activo → reuse detectado → revocar toda la familia
      await this.prisma.refreshToken.updateMany({
        where: { familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Reuso de token detectado. Todas las sesiones revocadas.',
      );
    }

    if (activeToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: activeToken.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Token de refresco expirado.');
    }

    // Revocar el actual y emitir nuevo en la misma familia
    const newBundle = this.tokenService.generateRefreshToken(userId, familyId);
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: activeToken.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash: newBundle.hash,
          familyId,
          expiresAt: newBundle.expiresAt,
        },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      role: user.role,
      workshopId: user.workshopId,
      familyId,
    });

    return { accessToken, refreshToken: newBundle.raw };
  }

  async logout(rawToken: string): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(rawToken);
    if (!payload) return; // Idempotente: token inválido → no hay nada que revocar

    const hash = this.tokenService.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    workshopId: string,
    dto: ChangePasswordDto,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid)
      throw new UnauthorizedException('Contraseña actual incorrecta.');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log(
      {
        workshopId,
        entityType: 'User',
        entityId: userId,
        action: 'USER_PASSWORD_CHANGED',
        actorId: userId,
      },
      tx,
    );
  }
}
