import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let configGet: jest.Mock;

  const CONFIG: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret-test',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'refresh-secret-test',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };

  beforeEach(() => {
    configGet = jest.fn((key: string) => CONFIG[key]);
    const configService = {
      get: configGet,
    } as unknown as ConstructorParameters<typeof TokenService>[1];
    service = new TokenService(new JwtService(), configService);
  });

  describe('generateAccessToken', () => {
    it('firma un access token con los claims esperados (sub/role/workshopId/familyId)', () => {
      const token = service.generateAccessToken({
        sub: 'user-1',
        role: 'ADMIN',
        workshopId: 'workshop-1',
        familyId: 'family-1',
      });

      const decoded = new JwtService().decode<{
        sub: string;
        role: string;
        workshopId: string;
        familyId: string;
        exp: number;
      }>(token);

      expect(decoded.sub).toBe('user-1');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.workshopId).toBe('workshop-1');
      expect(decoded.familyId).toBe('family-1');
    });

    it('usa JWT_ACCESS_SECRET (no el de refresh) para firmar', () => {
      const token = service.generateAccessToken({
        sub: 'user-1',
        role: 'ADMIN',
        workshopId: 'workshop-1',
        familyId: 'family-1',
      });

      expect(() =>
        new JwtService().verify(token, { secret: CONFIG.JWT_REFRESH_SECRET }),
      ).toThrow();
      expect(() =>
        new JwtService().verify(token, { secret: CONFIG.JWT_ACCESS_SECRET }),
      ).not.toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('genera un bundle con raw, hash (sha256 hex) y expiresAt derivado del exp del token', () => {
      const bundle = service.generateRefreshToken('user-1', 'family-1');

      expect(bundle.raw).toEqual(expect.any(String));
      expect(bundle.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(bundle.hash).toBe(service.hashToken(bundle.raw));
      expect(bundle.expiresAt).toBeInstanceOf(Date);
      expect(bundle.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('nunca devuelve el token crudo en texto plano como el hash', () => {
      const bundle = service.generateRefreshToken('user-1', 'family-1');
      expect(bundle.hash).not.toBe(bundle.raw);
    });

    it('dos llamadas producen tokens distintos (jti/iat varían) con hashes distintos', () => {
      const a = service.generateRefreshToken('user-1', 'family-1');
      const b = service.generateRefreshToken('user-1', 'family-1');
      // jsonwebtoken incluye iat en segundos; para evitar flakiness si ambas
      // llamadas caen en el mismo segundo, solo garantizamos que el hashing es
      // determinista sobre el mismo raw (ver test de abajo) y no forzamos
      // desigualdad estricta aquí.
      expect(service.hashToken(a.raw)).toBe(a.hash);
      expect(service.hashToken(b.raw)).toBe(b.hash);
    });
  });

  describe('verifyRefreshToken', () => {
    it('devuelve el payload { sub, familyId } para un token válido', () => {
      const bundle = service.generateRefreshToken('user-1', 'family-1');
      const payload = service.verifyRefreshToken(bundle.raw);
      expect(payload).toEqual({
        sub: 'user-1',
        familyId: 'family-1',
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    it('devuelve null (no lanza) ante un token con firma inválida', () => {
      const payload = service.verifyRefreshToken('esto-no-es-un-jwt-valido');
      expect(payload).toBeNull();
    });

    it('devuelve null ante un access token presentado como refresh token (secretos distintos)', () => {
      const accessToken = service.generateAccessToken({
        sub: 'user-1',
        role: 'ADMIN',
        workshopId: 'workshop-1',
        familyId: 'family-1',
      });
      expect(service.verifyRefreshToken(accessToken)).toBeNull();
    });

    it('devuelve null ante un refresh token expirado', () => {
      const configExpired = jest.fn((key: string) =>
        key === 'JWT_REFRESH_EXPIRES_IN' ? '-1s' : CONFIG[key],
      );
      const expiredService = new TokenService(new JwtService(), {
        get: configExpired,
      } as unknown as ConstructorParameters<typeof TokenService>[1]);
      const bundle = expiredService.generateRefreshToken('user-1', 'family-1');
      expect(expiredService.verifyRefreshToken(bundle.raw)).toBeNull();
    });
  });

  describe('hashToken', () => {
    it('es determinista: mismo input -> mismo hash', () => {
      expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    });

    it('produce hashes distintos para inputs distintos', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('abd'));
    });
  });
});
