import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { SupplierDto } from './dto/supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

type SupplierRecord = Awaited<
  ReturnType<PrismaService['supplier']['findUniqueOrThrow']>
>;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateSupplierDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<SupplierDto> {
    const db = tx ?? this.prisma;

    const supplier = await db.supplier.create({
      data: {
        workshopId: actor.workshopId,
        name: dto.name,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Supplier',
        entityId: supplier.id,
        action: 'SUPPLIER_CREATED',
        actorId: actor.id,
        after: { name: supplier.name, phone: supplier.phone },
      },
      tx,
    );

    return this.toDto(supplier);
  }

  async findAll(
    query: ListSuppliersQueryDto,
    actor: RequestUser,
  ): Promise<{ data: SupplierDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(
      ':',
    ) as ['name' | 'createdAt', 'asc' | 'desc'];

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data: data.map((s) => this.toDto(s)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<SupplierDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier || supplier.workshopId !== actor.workshopId)
      throw new NotFoundException();
    return this.toDto(supplier);
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<SupplierDto> {
    const db = tx ?? this.prisma;
    const supplier = await db.supplier.findUnique({ where: { id } });
    if (!supplier || supplier.workshopId !== actor.workshopId)
      throw new NotFoundException();

    const updated = await db.supplier.update({ where: { id }, data: dto });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Supplier',
        entityId: id,
        action: 'SUPPLIER_UPDATED',
        actorId: actor.id,
        before: { name: supplier.name, phone: supplier.phone },
        after: { name: updated.name, phone: updated.phone },
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
    const supplier = await db.supplier.findUnique({ where: { id } });
    if (!supplier || supplier.workshopId !== actor.workshopId)
      throw new NotFoundException();

    await db.supplier.update({ where: { id }, data: { isActive: false } });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Supplier',
        entityId: id,
        action: 'SUPPLIER_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  private toDto(supplier: SupplierRecord): SupplierDto {
    return {
      id: supplier.id,
      workshopId: supplier.workshopId,
      name: supplier.name,
      contactName: supplier.contactName ?? undefined,
      phone: supplier.phone,
      email: supplier.email ?? undefined,
      address: supplier.address ?? undefined,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
    };
  }
}
