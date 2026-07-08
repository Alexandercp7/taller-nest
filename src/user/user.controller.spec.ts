// NOTA (hallazgos QA bloqueantes — ver reporte):
// 1) La config de Jest en package.json no tiene `moduleNameMapper` para el alias
//    `@common/*` de tsconfig. Sin ese mapeo, esta suite ni siquiera cargaba
//    ("Cannot find module '@common/exceptions/domain.exceptions'" al importar
//    transitivamente users.service.ts).
// 2) user.controller.ts (a diferencia del resto del repo) importa con la ruta
//    literal 'src/common/...' en vez del alias '@common/...' o una ruta relativa;
//    esa forma tampoco resuelve bajo Jest (que no conoce el `baseUrl` de tsconfig).
// Mitigamos ambos con mocks "virtuales" que re-exportan las clases/decoradores
// reales (mismas referencias) mientras nest-engineer aplica el fix definitivo
// (moduleNameMapper) y unifica el estilo de import en user.controller.ts.
jest.mock(
  '@common/exceptions/domain.exceptions',
  () => jest.requireActual('../common/exceptions/domain.exceptions'),
  { virtual: true },
);
jest.mock(
  'src/common/decorators/current-user.decorator',
  () => jest.requireActual('../common/decorators/current-user.decorator'),
  { virtual: true },
);
jest.mock(
  'src/common/decorators/require-permission.decorator',
  () => jest.requireActual('../common/decorators/require-permission.decorator'),
  { virtual: true },
);
jest.mock('src/common/types/request-user.type', () => ({}), { virtual: true });

import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersController } from './user.controller';
import { UsersService } from './users.service';
import { RequestUser } from '../common/types/request-user.type';
import { REQUIRES_PERMISSION_KEY } from '../common/decorators/require-permission.decorator';

describe('UsersController', () => {
  let controller: UsersController;
  const usersServiceMock = {
    findMe: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    updatePermissions: jest.fn(),
    deactivate: jest.fn(),
  };

  const actor: RequestUser = {
    id: 'actor-1',
    workshopId: 'workshop-1',
    role: Role.ADMIN,
    effectivePermissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service', () => {
    it('getMe delega en findMe(user.id) — sin pasar por el service de permisos', () => {
      controller.getMe(actor);
      expect(usersServiceMock.findMe).toHaveBeenCalledWith(actor.id);
    });

    it('create delega el dto y el actor completo (para la doble defensa de rol en el service)', () => {
      const dto = {
        email: 'a@a.com',
        firstName: 'A',
        lastName: 'B',
        password: 'password123',
        role: Role.TECHNICIAN,
      };
      controller.create(dto, actor);
      expect(usersServiceMock.create).toHaveBeenCalledWith(dto, actor);
    });

    it('deactivate delega el id y el actor (soft-delete, nunca hard-delete)', async () => {
      await controller.deactivate('target-1', actor);
      expect(usersServiceMock.deactivate).toHaveBeenCalledWith(
        'target-1',
        actor,
      );
    });

    it('updatePermissions delega id, dto y actor', async () => {
      const dto = { permissions: [{ permissionId: 'p1', granted: true }] };
      await controller.updatePermissions('target-1', dto, actor);
      expect(usersServiceMock.updatePermissions).toHaveBeenCalledWith(
        'target-1',
        dto,
        actor,
      );
    });
  });

  describe('metadata de autorización (@RequirePermission)', () => {
    // Estos tests solo verifican que el decorador está declarado en los handlers
    // sensibles. La aplicación real de este metadato SÍ está cubierta: PermissionsGuard
    // y JwtAuthGuard están registrados globalmente como APP_GUARD en src/app.module.ts,
    // y su comportamiento (ADMIN bypass, DIRECTOR sin user:manage, etc.) se prueba en
    // src/common/guards/permissions.guard.spec.ts y jwt-auth.guard.spec.ts.
    it.each([
      ['create', 'user:manage'],
      ['findAll', 'user:manage'],
      ['update', 'user:manage'],
      ['updatePermissions', 'user:manage'],
      ['deactivate', 'user:manage'],
    ])('%s requiere el permiso %s', (method, expectedPermission) => {
      const handler = (
        UsersController.prototype as unknown as Record<string, () => unknown>
      )[method];
      const permission = Reflect.getMetadata(REQUIRES_PERMISSION_KEY, handler);
      expect(permission).toBe(expectedPermission);
    });

    it('getMe no exige un permiso granular (solo requiere estar autenticado)', () => {
      const permission = Reflect.getMetadata(
        REQUIRES_PERMISSION_KEY,
        UsersController.prototype.getMe,
      );
      expect(permission).toBeUndefined();
    });
  });
});
