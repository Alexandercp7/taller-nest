import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';

// AVISO QA: este módulo es todavía el scaffold por defecto de `nest g resource`
// (ver hallazgo en el reporte) — sin PrismaService, sin `workshopId`, sin
// soft-delete, sin relación con Client, con DTOs vacíos. No hay ninguna regla de
// negocio real que verificar todavía. Estos tests solo fijan el contrato actual
// (placeholder) para detectar cambios accidentales; deben reescribirse por
// completo cuando arquitecto/nest-engineer implementen el CRUD real descrito en
// las 12 reglas no negociables (workshopId en la raíz, soft-delete, etc.).
describe('VehiclesService', () => {
  let service: VehiclesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehiclesService],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('contrato actual (placeholder, pendiente de implementación real)', () => {
    it('create devuelve un string fijo (no persiste nada)', () => {
      expect(service.create({})).toBe('This action adds a new vehicle');
    });

    it('findAll devuelve un string fijo (no consulta nada)', () => {
      expect(service.findAll()).toBe('This action returns all vehicles');
    });

    it('findOne interpola el id recibido', () => {
      expect(service.findOne(42)).toBe('This action returns a #42 vehicle');
    });

    it('update interpola el id recibido', () => {
      expect(service.update(7, {})).toBe('This action updates a #7 vehicle');
    });

    it('remove interpola el id recibido (no es soft-delete: no hay persistencia aún)', () => {
      expect(service.remove(3)).toBe('This action removes a #3 vehicle');
    });
  });
});
