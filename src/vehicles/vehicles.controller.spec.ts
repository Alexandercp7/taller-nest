import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

// AVISO QA: mismo caveat que vehicles.service.spec.ts — módulo sin implementar
// (scaffold). Además, este controller NO tiene ningún `@RequirePermission(...)`
// ni guard propio: al ser el único módulo de negocio sin decorador de permisos,
// hoy queda accesible a cualquier usuario autenticado (JwtAuthGuard global sí
// aplica, PermissionsGuard no exige nada al no haber metadata). Cuando se
// implemente el CRUD real, debe decidirse y aplicarse el permiso granular
// correspondiente (p.ej. `vehicle:manage` / `vehicle:read`) — ver hallazgo en el
// reporte.
describe('VehiclesController', () => {
  let controller: VehiclesController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehiclesService, useValue: serviceMock }],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegación al service (contrato actual, placeholder)', () => {
    it('findOne convierte el :id de string a number antes de delegar', () => {
      controller.findOne('42');
      expect(serviceMock.findOne).toHaveBeenCalledWith(42);
    });

    it('update convierte el :id de string a number antes de delegar', () => {
      const dto = {};
      controller.update('7', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(7, dto);
    });

    it('remove convierte el :id de string a number antes de delegar', () => {
      controller.remove('3');
      expect(serviceMock.remove).toHaveBeenCalledWith(3);
    });

    it('create delega el dto tal cual', () => {
      const dto = {};
      controller.create(dto);
      expect(serviceMock.create).toHaveBeenCalledWith(dto);
    });
  });
});
