import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash } from 'crypto';

export interface JwtPayload {
  sub: string;
  role: string;
  workshopId: string;
  familyId: string;
}

export interface RefreshPayload {
  sub: string;
  familyId: string;
}

export interface RefreshTokenBundle {
  raw: string;
  hash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
        '15m') as JwtSignOptions['expiresIn'],
    });
  }

  generateRefreshToken(userId: string, familyId: string): RefreshTokenBundle {
    const raw = this.jwtService.sign(
      { sub: userId, familyId } satisfies RefreshPayload,
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as JwtSignOptions['expiresIn'],
      },
    );
    const hash = this.hashToken(raw);
    const decoded = this.jwtService.decode<{ exp: number }>(raw);
    const expiresAt = new Date(decoded.exp * 1000);
    return { raw, hash, expiresAt };
  }

  verifyRefreshToken(raw: string): RefreshPayload | null {
    try {
      return this.jwtService.verify<RefreshPayload>(raw, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return null;
    }
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
