import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleDto } from './dto/vehicle.dto';
import {
  VIN_DECODER,
  VinDecodeResult,
  VinDecoder,
} from './vin-decoder/vin-decoder';
import { ListVehiclesQueryDto } from './dto/list-vehicle-query.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    @Inject(VIN_DECODER) private readonly vinDecoder: VinDecoder,
  ) {}

  async create(
    dto: CreateVehicleDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<VehicleDto> {
    const db = tx ?? this.prisma;

    await this.clients.assertActiveClient(dto.clientId, actor.workshopId, tx);

    if (dto.vin) {
      const existing = await db.vehicle.findFirst({
        where: { workshopId: actor.workshopId, vin: dto.vin },
      });
      if (existing) throw new ConflictException('El VIN ya está registrado.');
    }

    const vehicle = await db.vehicle.create({
      data: {
        workshopId: actor.workshopId,
        clientId: dto.clientId,
        plate: dto.plate,
        vin: dto.vin,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        km: dto.km,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Vehicle',
        entityId: vehicle.id,
        action: 'VEHICLE_CREATED',
        actorId: actor.id,
        after: {
          plate: vehicle.plate,
          vin: vehicle.vin,
          clientId: vehicle.clientId,
        },
      },
      tx,
    );

    return this.toVehicleDto(vehicle);
  }

  async findAll(
    query: ListVehiclesQueryDto,
    actor: RequestUser,
  ): Promise<{ data: VehicleDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search
        ? {
            OR: [
              { plate: { contains: query.search, mode: 'insensitive' } },
              { vin: { contains: query.search, mode: 'insensitive' } },
              { make: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(
      ':',
    ) as ['plate' | 'createdAt', 'asc' | 'desc'];

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data: data.map((v) => this.toVehicleDto(v)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<VehicleDto> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.workshopId !== actor.workshopId)
      throw new NotFoundException();
    return this.toVehicleDto(vehicle);
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<VehicleDto> {
    const db = tx ?? this.prisma;
    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.workshopId !== actor.workshopId)
      throw new NotFoundException();

    if (dto.clientId && dto.clientId !== vehicle.clientId) {
      await this.clients.assertActiveClient(dto.clientId, actor.workshopId, tx);
    }

    if (dto.vin && dto.vin !== vehicle.vin) {
      const existing = await db.vehicle.findFirst({
        where: { workshopId: actor.workshopId, vin: dto.vin, NOT: { id } },
      });
      if (existing) throw new ConflictException('El VIN ya está registrado.');
    }

    const updated = await db.vehicle.update({ where: { id }, data: dto });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Vehicle',
        entityId: id,
        action: 'VEHICLE_UPDATED',
        actorId: actor.id,
        before: {
          plate: vehicle.plate,
          vin: vehicle.vin,
          clientId: vehicle.clientId,
        },
        after: {
          plate: updated.plate,
          vin: updated.vin,
          clientId: updated.clientId,
        },
      },
      tx,
    );

    return this.toVehicleDto(updated);
  }

  async deactivate(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.workshopId !== actor.workshopId)
      throw new NotFoundException();

    await db.vehicle.update({ where: { id }, data: { isActive: false } });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Vehicle',
        entityId: id,
        action: 'VEHICLE_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  lookupVin(vin: string): Promise<VinDecodeResult> {
    return this.vinDecoder.decode(vin);
  }

  private toVehicleDto(vehicle: {
    id: string;
    workshopId: string;
    clientId: string;
    plate: string;
    vin: string | null;
    make: string;
    model: string;
    year: number;
    km: number | null;
    isActive: boolean;
    createdAt: Date;
  }): VehicleDto {
    return {
      id: vehicle.id,
      workshopId: vehicle.workshopId,
      clientId: vehicle.clientId,
      plate: vehicle.plate,
      vin: vehicle.vin ?? undefined,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      km: vehicle.km ?? undefined,
      isActive: vehicle.isActive,
      createdAt: vehicle.createdAt,
    };
  }
}
