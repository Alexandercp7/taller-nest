import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CommercialStatus,
  OperationalStatus,
  PhotoCategory,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '@common/types/request-user.type';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;

  const prisma = {
    client: { findFirst: jest.fn() },
    vehicle: { findFirst: jest.fn() },
    workOrder: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    otNote: { create: jest.fn() },
    otPhoto: { create: jest.fn() },
  } as unknown as PrismaService;

  const audit = { log: jest.fn() } as unknown as AuditService;
  const storage = {
    upload: jest.fn().mockResolvedValue('https://r2.example.com/photo.jpg'),
    delete: jest.fn(),
  } as unknown as R2StorageService;

  const actor: RequestUser = {
    id: 'user-advisor',
    workshopId: 'workshop-1',
    role: 'SERVICE_ADVISOR',
    effectivePermissions: [],
  };

  const createDto: CreateWorkOrderDto = {
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    failureDescription: 'Frenos rechinan',
    mileageIn: 50000,
    fuelLevel: 75,
  };

  const mockDbOrder = {
    id: 'wo-1',
    workshopId: actor.workshopId,
    code: 'OT-0001',
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    serviceAdvisorId: 'user-advisor',
    operationalStatus: OperationalStatus.RECIBIDA,
    commercialStatus: CommercialStatus.SIN_COTIZAR,
    billingStatus: 'NO_REQUERIDA',
    estaRetrasada: false,
    portalToken: 'token-uuid-1234',
    mileageIn: 50000,
    fuelLevel: 75,
    failureDescription: 'Frenos rechinan',
    diagnosis: null,
    estimatedDelivery: null,
    deliveredAt: null,
    closedAt: null,
    cancelledAt: null,
    cancelReason: null,
    client: { id: 'client-1', name: 'Carlos Slim' },
    vehicle: {
      id: 'vehicle-1',
      clientId: 'client-1',
      make: 'Nissan',
      model: 'Sentra',
      year: 2020,
      plate: 'ABC-123',
    },
    serviceAdvisor: {
      id: 'user-advisor',
      firstName: 'Asesor',
      lastName: 'Pérez',
    },
    checklist: null,
    notes: [],
    photos: [],
    quotation: { total: { toString: () => '0.00' } },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrdersService(prisma, audit, storage);
  });

  describe('create', () => {
    it('crea una orden de trabajo con código secuencial y audita WORK_ORDER_CREATED', async () => {
      (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: 'client-1' });
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({
        id: 'vehicle-1',
        clientId: 'client-1',
      });
      (prisma.workOrder.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.workOrder.create as jest.Mock).mockResolvedValue(mockDbOrder);

      const result = await service.create(createDto, actor);

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', workshopId: actor.workshopId },
      });
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: 'vehicle-1', workshopId: actor.workshopId },
      });
      expect(prisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: actor.workshopId,
            code: 'OT-0001',
            clientId: 'client-1',
            vehicleId: 'vehicle-1',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'WORK_ORDER_CREATED' }),
        undefined,
      );
      expect(result.code).toBe('OT-0001');
    });

    it('lanza BadRequestException si el vehículo no pertenece al cliente', async () => {
      (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: 'client-1' });
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({
        id: 'vehicle-1',
        clientId: 'another-client',
      });

      await expect(service.create(createDto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('genera siguiente código secuencial correctamente', async () => {
      (prisma.client.findFirst as jest.Mock).mockResolvedValue({ id: 'client-1' });
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({
        id: 'vehicle-1',
        clientId: 'client-1',
      });
      (prisma.workOrder.findFirst as jest.Mock).mockResolvedValue({ code: 'OT-0042' });
      (prisma.workOrder.create as jest.Mock).mockResolvedValue({
        ...mockDbOrder,
        code: 'OT-0043',
      });

      const result = await service.create(createDto, actor);
      expect(result.code).toBe('OT-0043');
    });
  });

  describe('changeOperationalStatus', () => {
    it('avanza estado a EN_DIAGNOSTICO y audita', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockDbOrder);
      (prisma.workOrder.update as jest.Mock).mockResolvedValue({
        ...mockDbOrder,
        operationalStatus: OperationalStatus.EN_DIAGNOSTICO,
      });

      const result = await service.changeOperationalStatus(
        'wo-1',
        { status: OperationalStatus.EN_DIAGNOSTICO },
        actor,
      );

      expect(result.operationalStatus).toBe(OperationalStatus.EN_DIAGNOSTICO);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'WORK_ORDER_STATUS_CHANGED' }),
        undefined,
      );
    });

    it('rechaza salto ilegal directo de RECIBIDA a EN_REPARACION', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockDbOrder);

      await expect(
        service.changeOperationalStatus(
          'wo-1',
          { status: OperationalStatus.EN_REPARACION },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza intento de un técnico de cerrar o cancelar la OT', async () => {
      const techActor: RequestUser = {
        ...actor,
        role: Role.TECHNICIAN,
      };
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue({
        ...mockDbOrder,
        operationalStatus: OperationalStatus.ENTREGADA,
      });

      await expect(
        service.changeOperationalStatus(
          'wo-1',
          { status: OperationalStatus.CERRADA },
          techActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('elimina la orden de trabajo si está en RECIBIDA', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue(mockDbOrder);
      (prisma.workOrder.delete as jest.Mock).mockResolvedValue(mockDbOrder);

      await service.remove('wo-1', actor);

      expect(prisma.workOrder.delete).toHaveBeenCalledWith({ where: { id: 'wo-1' } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'WORK_ORDER_DELETED' }),
        undefined,
      );
    });

    it('rechaza eliminar una orden en EN_REPARACION', async () => {
      (prisma.workOrder.findUnique as jest.Mock).mockResolvedValue({
        ...mockDbOrder,
        operationalStatus: OperationalStatus.EN_REPARACION,
      });

      await expect(service.remove('wo-1', actor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
