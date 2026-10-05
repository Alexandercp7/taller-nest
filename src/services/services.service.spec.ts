import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServiceCategory, VehicleType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '@common/types/request-user.type';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let service: ServicesService;

  const prisma = {
    service: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    servicePrice: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;

  const actor: RequestUser = {
    id: 'user-1',
    workshopId: 'workshop-1',
    role: 'ADMIN',
    effectivePermissions: [],
  };

  const createDto: CreateServiceDto = {
    code: 'SRV-FREN-01',
    concept: 'Cambio de balatas delanteras',
    category: ServiceCategory.FRENOS_Y_SUSPENSION,
    system: 'Frenos',
    family: 'Discos',
    estimatedMinutes: 60,
    basePrice: '350.00',
    costPrice: '150.00',
    prices: [
      { vehicleType: VehicleType.AUTO, price: '400.00' },
      { vehicleType: VehicleType.CAMIONETA, price: '500.00' },
    ],
  };

  const mockDbRecord = {
    id: 'srv-1',
    workshopId: actor.workshopId,
    code: 'SRV-FREN-01',
    concept: 'Cambio de balatas delanteras',
    category: ServiceCategory.FRENOS_Y_SUSPENSION,
    system: 'Frenos',
    family: 'Discos',
    estimatedMinutes: 60,
    basePrice: { toString: () => '350.00' },
    costPrice: { toString: () => '150.00' },
    notes: null,
    isActive: true,
    prices: [
      {
        id: 'sp-1',
        serviceId: 'srv-1',
        vehicleType: VehicleType.AUTO,
        price: { toString: () => '400.00' },
      },
      {
        id: 'sp-2',
        serviceId: 'srv-1',
        vehicleType: VehicleType.CAMIONETA,
        price: { toString: () => '500.00' },
      },
    ],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServicesService(prisma, audit);
  });

  describe('create', () => {
    it('crea un servicio con precios por tipo de vehículo y audita SERVICE_CREATED', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockDbRecord);

      const result = await service.create(createDto, actor);

      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: { workshopId: actor.workshopId, code: createDto.code },
      });
      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: actor.workshopId,
            code: createDto.code,
            concept: createDto.concept,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVICE_CREATED' }),
        undefined,
      );
      expect(result.id).toBe('srv-1');
      expect(result.prices).toHaveLength(2);
    });

    it('lanza ConflictException si el código ya existe en el taller', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto, actor)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('retorna servicios paginados y resuelve precio para vehicleType', async () => {
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockDbRecord]);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10, vehicleType: VehicleType.CAMIONETA },
        actor,
      );

      expect(result.total).toBe(1);
      expect(result.data[0].resolvedPrice).toBe('500.00');
    });
  });

  describe('findOne', () => {
    it('retorna el servicio y resuelve precio', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);

      const result = await service.findOne('srv-1', actor, VehicleType.AUTO);

      expect(result.id).toBe('srv-1');
      expect(result.resolvedPrice).toBe('400.00');
    });

    it('lanza NotFoundException si no existe', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza el servicio y audita SERVICE_UPDATED', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        concept: 'Concepto actualizado',
      });

      const result = await service.update(
        'srv-1',
        { concept: 'Concepto actualizado' },
        actor,
      );

      expect(result.concept).toBe('Concepto actualizado');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVICE_UPDATED' }),
        undefined,
      );
    });
  });

  describe('setPrices', () => {
    it('reemplaza la matriz de precios y audita SERVICE_PRICES_UPDATED', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);
      (prisma.servicePrice.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.servicePrice.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.service.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        prices: [
          {
            id: 'sp-new',
            serviceId: 'srv-1',
            vehicleType: VehicleType.CAMION,
            price: { toString: () => '800.00' },
          },
        ],
      });

      const result = await service.setPrices(
        'srv-1',
        { prices: [{ vehicleType: VehicleType.CAMION, price: '800.00' }] },
        actor,
      );

      expect(prisma.servicePrice.deleteMany).toHaveBeenCalledWith({
        where: { serviceId: 'srv-1' },
      });
      expect(prisma.servicePrice.createMany).toHaveBeenCalledWith({
        data: [{ serviceId: 'srv-1', vehicleType: VehicleType.CAMION, price: '800.00' }],
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVICE_PRICES_UPDATED' }),
        undefined,
      );
      expect(result.prices[0].vehicleType).toBe(VehicleType.CAMION);
    });
  });

  describe('remove', () => {
    it('desactiva el servicio con soft-delete y audita SERVICE_DEACTIVATED', async () => {
      (prisma.service.findFirst as jest.Mock).mockResolvedValue(mockDbRecord);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockDbRecord,
        isActive: false,
      });

      await service.remove('srv-1', actor);

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'srv-1' },
        data: { isActive: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SERVICE_DEACTIVATED' }),
        undefined,
      );
    });
  });
});
