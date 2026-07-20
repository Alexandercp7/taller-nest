import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialOrderPartDto } from './dto/create-special-order-part.dto';
import { ListSpecialOrderPartsQueryDto } from './dto/list-special-order-parts-query.dto';
import { SpecialOrderPartDto } from './dto/special-order-part.dto';
import { UpdateSpecialOrderPartDto } from './dto/update-special-order-part.dto';

type SpecialOrderPartRecord = Awaited<
  ReturnType<PrismaService['specialOrderPart']['findUniqueOrThrow']>
>;

@Injectable()
export class SpecialOrderPartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateSpecialOrderPartDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<SpecialOrderPartDto> {
    const db = tx ?? this.prisma;

    const existing = await db.specialOrderPart.findFirst({
      where: { workshopId: actor.workshopId, sku: dto.sku },
    });
    if (existing) throw new ConflictException('El SKU ya está en uso.');

    const item = await db.specialOrderPart.create({
      data: {
        workshopId: actor.workshopId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'SpecialOrderPart',
        entityId: item.id,
        action: 'SPECIAL_ORDER_PART_CREATED',
        actorId: actor.id,
        after: {
          sku: item.sku,
          name: item.name,
          unitPrice: item.unitPrice.toString(),
        },
      },
      tx,
    );

    return this.toDto(item);
  }

  async findAll(
    query: ListSpecialOrderPartsQueryDto,
    actor: RequestUser,
  ): Promise<{ data: SpecialOrderPartDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SpecialOrderPartWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(
      ':',
    ) as ['name' | 'createdAt', 'asc' | 'desc'];

    const [data, total] = await Promise.all([
      this.prisma.specialOrderPart.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
      }),
      this.prisma.specialOrderPart.count({ where }),
    ]);

    return { data: data.map((i) => this.toDto(i)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<SpecialOrderPartDto> {
    const item = await this.prisma.specialOrderPart.findUnique({
      where: { id },
    });
    return this.toDto(assertWorkshopScoped(item, actor));
  }

  async update(
    id: string,
    dto: UpdateSpecialOrderPartDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<SpecialOrderPartDto> {
    const db = tx ?? this.prisma;
    const item = assertWorkshopScoped(
      await db.specialOrderPart.findUnique({ where: { id } }),
      actor,
    );

    if (dto.sku && dto.sku !== item.sku) {
      const existing = await db.specialOrderPart.findFirst({
        where: { workshopId: actor.workshopId, sku: dto.sku, NOT: { id } },
      });
      if (existing) throw new ConflictException('El SKU ya está en uso.');
    }

    const updated = await db.specialOrderPart.update({
      where: { id },
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        unitPrice:
          dto.unitPrice !== undefined
            ? new Prisma.Decimal(dto.unitPrice)
            : undefined,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'SpecialOrderPart',
        entityId: id,
        action: 'SPECIAL_ORDER_PART_UPDATED',
        actorId: actor.id,
        before: { name: item.name, unitPrice: item.unitPrice.toString() },
        after: { name: updated.name, unitPrice: updated.unitPrice.toString() },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async deactivate(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    assertWorkshopScoped(
      await db.specialOrderPart.findUnique({ where: { id } }),
      actor,
    );

    await db.specialOrderPart.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'SpecialOrderPart',
        entityId: id,
        action: 'SPECIAL_ORDER_PART_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  private toDto(item: SpecialOrderPartRecord): SpecialOrderPartDto {
    return {
      id: item.id,
      workshopId: item.workshopId,
      sku: item.sku,
      name: item.name,
      description: item.description ?? undefined,
      unitPrice: item.unitPrice.toFixed(2),
      isActive: item.isActive,
      createdAt: item.createdAt,
    };
  }
}
