import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VehicleType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { resolveServicePrice } from './domain/service-price.resolver';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { ServiceDto } from './dto/service.dto';
import { SetServicePricesDto } from './dto/set-service-prices.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

type ServiceWithPrices = Prisma.ServiceGetPayload<{
  include: { prices: true };
}>;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateServiceDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ServiceDto> {
    const db = tx ?? this.prisma;

    if (dto.code) {
      const existing = await db.service.findFirst({
        where: { workshopId: actor.workshopId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un servicio con el código '${dto.code}' en este taller.`,
        );
      }
    }

    const service = await db.service.create({
      data: {
        workshopId: actor.workshopId,
        code: dto.code,
        concept: dto.concept,
        category: dto.category,
        system: dto.system,
        family: dto.family,
        estimatedMinutes: dto.estimatedMinutes,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
        notes: dto.notes,
        prices: dto.prices && dto.prices.length > 0
          ? {
              create: dto.prices.map((p) => ({
                vehicleType: p.vehicleType,
                price: p.price,
              })),
            }
          : undefined,
      },
      include: {
        prices: true,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Service',
        entityId: service.id,
        action: 'SERVICE_CREATED',
        actorId: actor.id,
        after: {
          concept: service.concept,
          code: service.code,
          category: service.category,
          basePrice: service.basePrice?.toString(),
        },
      },
      tx,
    );

    return this.toDto(service);
  }

  async findAll(
    query: ListServicesQueryDto,
    actor: RequestUser,
  ): Promise<{ data: ServiceDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.system
        ? { system: { contains: query.system, mode: 'insensitive' } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { concept: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: { prices: true },
        orderBy: { concept: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item, query.vehicleType)),
      total,
    };
  }

  async findOne(
    id: string,
    actor: RequestUser,
    vehicleType?: VehicleType,
  ): Promise<ServiceDto> {
    const service = await this.prisma.service.findFirst({
      where: { id, workshopId: actor.workshopId },
      include: { prices: true },
    });

    if (!service) {
      throw new NotFoundException(`Servicio con id '${id}' no encontrado.`);
    }

    return this.toDto(service, vehicleType);
  }

  async update(
    id: string,
    dto: UpdateServiceDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ServiceDto> {
    const db = tx ?? this.prisma;

    const existing = await db.service.findFirst({
      where: { id, workshopId: actor.workshopId },
      include: { prices: true },
    });

    if (!existing) {
      throw new NotFoundException(`Servicio con id '${id}' no encontrado.`);
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await db.service.findFirst({
        where: { workshopId: actor.workshopId, code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException(
          `Ya existe un servicio con el código '${dto.code}' en este taller.`,
        );
      }
    }

    const updated = await db.service.update({
      where: { id },
      data: {
        code: dto.code !== undefined ? dto.code : existing.code,
        concept: dto.concept ?? existing.concept,
        category: dto.category ?? existing.category,
        system: dto.system ?? existing.system,
        family: dto.family !== undefined ? dto.family : existing.family,
        estimatedMinutes:
          dto.estimatedMinutes !== undefined
            ? dto.estimatedMinutes
            : existing.estimatedMinutes,
        basePrice:
          dto.basePrice !== undefined ? dto.basePrice : existing.basePrice,
        costPrice:
          dto.costPrice !== undefined ? dto.costPrice : existing.costPrice,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        ...(dto.prices !== undefined
          ? {
              prices: {
                deleteMany: {},
                create: dto.prices.map((p) => ({
                  vehicleType: p.vehicleType,
                  price: p.price,
                })),
              },
            }
          : {}),
      },
      include: { prices: true },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Service',
        entityId: updated.id,
        action: 'SERVICE_UPDATED',
        actorId: actor.id,
        before: {
          concept: existing.concept,
          code: existing.code,
          basePrice: existing.basePrice?.toString(),
        },
        after: {
          concept: updated.concept,
          code: updated.code,
          basePrice: updated.basePrice?.toString(),
        },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async setPrices(
    id: string,
    dto: SetServicePricesDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ServiceDto> {
    const db = tx ?? this.prisma;

    const existing = await db.service.findFirst({
      where: { id, workshopId: actor.workshopId },
    });

    if (!existing) {
      throw new NotFoundException(`Servicio con id '${id}' no encontrado.`);
    }

    await db.servicePrice.deleteMany({
      where: { serviceId: id },
    });

    if (dto.prices.length > 0) {
      await db.servicePrice.createMany({
        data: dto.prices.map((p) => ({
          serviceId: id,
          vehicleType: p.vehicleType,
          price: p.price,
        })),
      });
    }

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Service',
        entityId: id,
        action: 'SERVICE_PRICES_UPDATED',
        actorId: actor.id,
        after: { priceCount: dto.prices.length },
      },
      tx,
    );

    const updated = await db.service.findUniqueOrThrow({
      where: { id },
      include: { prices: true },
    });

    return this.toDto(updated);
  }

  async remove(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const service = await db.service.findFirst({
      where: { id, workshopId: actor.workshopId },
    });

    if (!service) {
      throw new NotFoundException(`Servicio con id '${id}' no encontrado.`);
    }

    await db.service.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Service',
        entityId: id,
        action: 'SERVICE_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  private toDto(
    record: ServiceWithPrices,
    vehicleType?: VehicleType,
  ): ServiceDto {
    const resolved = resolveServicePrice(record, vehicleType);

    return {
      id: record.id,
      workshopId: record.workshopId,
      code: record.code,
      concept: record.concept,
      category: record.category,
      system: record.system,
      family: record.family,
      estimatedMinutes: record.estimatedMinutes,
      basePrice: record.basePrice ? record.basePrice.toString() : null,
      costPrice: record.costPrice ? record.costPrice.toString() : null,
      resolvedPrice: resolved,
      notes: record.notes,
      isActive: record.isActive,
      prices: (record.prices ?? []).map((p) => ({
        id: p.id,
        serviceId: p.serviceId,
        vehicleType: p.vehicleType,
        price: p.price.toString(),
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
