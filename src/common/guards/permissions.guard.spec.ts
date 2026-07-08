import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';
import { RequestUser } from '../types/request-user.type';

// Invariante de docs/auth.md: ADMIN bypass total; DIRECTOR opera todo EXCEPTO
// `user:manage`; el resto depende de effectivePermissions.

function makeContext(
  user: RequestUser,
  requiredPermission: string | undefined,
): ExecutionContext {
  const handler = () => undefined;
  const klass = class {};
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(requiredPermission: string | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermission),
  } as unknown as Reflector;
}

describe('PermissionsGuard', () => {
  const baseUser = (overrides: Partial<RequestUser>): RequestUser => ({
    id: 'u1',
    workshopId: 'w1',
    role: Role.TECHNICIAN,
    effectivePermissions: [],
    ...overrides,
  });

  it('permite el acceso si el handler no exige ningún permiso', () => {
    const guard = new PermissionsGuard(makeReflector(undefined));
    const ctx = makeContext(baseUser({ role: Role.TECHNICIAN }), undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('ADMIN: bypass total, incluso para user:manage', () => {
    const guard = new PermissionsGuard(makeReflector('user:manage'));
    const ctx = makeContext(baseUser({ role: Role.ADMIN }), 'user:manage');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('DIRECTOR: NO puede user:manage (regla no negociable)', () => {
    const guard = new PermissionsGuard(makeReflector('user:manage'));
    const ctx = makeContext(baseUser({ role: Role.DIRECTOR }), 'user:manage');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('DIRECTOR: puede cualquier otro permiso sin necesitar effectivePermissions', () => {
    const guard = new PermissionsGuard(makeReflector('work-order:approve'));
    const ctx = makeContext(
      baseUser({ role: Role.DIRECTOR, effectivePermissions: [] }),
      'work-order:approve',
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rol base (no ADMIN/DIRECTOR) con el permiso concedido en effectivePermissions -> permite', () => {
    const guard = new PermissionsGuard(makeReflector('vehicle:create'));
    const ctx = makeContext(
      baseUser({
        role: Role.SERVICE_ADVISOR,
        effectivePermissions: ['vehicle:create'],
      }),
      'vehicle:create',
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rol base sin el permiso concedido -> 403', () => {
    const guard = new PermissionsGuard(makeReflector('user:manage'));
    const ctx = makeContext(
      baseUser({ role: Role.SERVICE_ADVISOR, effectivePermissions: [] }),
      'user:manage',
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('TECHNICIAN sin el permiso exigido -> 403', () => {
    const guard = new PermissionsGuard(makeReflector('inventory:adjust'));
    const ctx = makeContext(
      baseUser({
        role: Role.TECHNICIAN,
        effectivePermissions: ['vehicle:read'],
      }),
      'inventory:adjust',
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
