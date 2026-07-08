import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// Invariante: las rutas marcadas @Public() (login, refresh) deben saltarse la
// verificación JWT; el resto exige un access token válido (delegado a passport-jwt).

function makeContext(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rutas @Public() -> permite sin invocar la estrategia passport', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)),
      'canActivate',
    );

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('rutas NO públicas -> delega en la estrategia passport-jwt (no hay bypass)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(makeContext());

    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
