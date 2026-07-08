import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '@prisma-service/prisma.service';
import { JwtPayload } from '../token.service';
import { RequestUser } from '@common/types/request-user.type';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }
  async validate(payload: JwtPayload): Promise<RequestUser> {
    // La sesión (familyId) debe seguir activa: logout, recierre de familia por
    // reuso o cambio de contraseña la revocan, invalidando de inmediato
    // cualquier access token ya emitido para esa sesión.
    const activeToken = await this.prisma.refreshToken.findFirst({
      where: { familyId: payload.familyId, revokedAt: null },
      include: {
        user: {
          include: {
            userPermissions: {
              where: { granted: true },
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!activeToken || !activeToken.user.isActive) {
      throw new UnauthorizedException('Sesión inválida o revocada');
    }

    const { user } = activeToken;
    const effectivePermissions = user.userPermissions.map(
      (up) => up.permission.code,
    );

    return {
      id: user.id,
      role: user.role,
      workshopId: user.workshopId,
      effectivePermissions,
    };
  }
}
