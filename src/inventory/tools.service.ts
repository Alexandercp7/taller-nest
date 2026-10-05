import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { ListToolsQueryDto } from './dto/list-tools-query.dto';
import { ToolDto } from './dto/tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

type ToolRecord = Awaited<
  ReturnType<PrismaService['tool']['findUniqueOrThrow']>
>;

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: R2StorageService,
  ) {}

  async create(
    dto: CreateToolDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ToolDto> {
    const db = tx ?? this.prisma;

    if (dto.assignedToUserId) {
      const technician = await db.user.findUnique({
        where: { id: dto.assignedToUserId },
      });
      if (!technician || technician.workshopId !== actor.workshopId || !technician.isActive) {
        throw new NotFoundException('Técnico asignado no encontrado o inactivo.');
      }
    }

    const tool = await db.tool.create({
      data: {
        workshopId: actor.workshopId,
        serialNumber: dto.serialNumber,
        name: dto.name,
        brand: dto.brand,
        description: dto.description,
        condition: dto.condition,
        status: dto.status,
        purchasePrice: dto.purchasePrice,
        assignedToUserId: dto.assignedToUserId,
        lastMaintenanceAt: dto.lastMaintenanceAt ? new Date(dto.lastMaintenanceAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Tool',
        entityId: tool.id,
        action: 'TOOL_CREATED',
        actorId: actor.id,
        after: { name: tool.name, brand: tool.brand, status: tool.status },
      },
      tx,
    );

    return this.toDto(tool);
  }

  async findAll(
    query: ListToolsQueryDto,
    actor: RequestUser,
  ): Promise<{ data: ToolDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ToolWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedToUserId ? { assignedToUserId: query.assignedToUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [tools, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tool.count({ where }),
    ]);

    return { data: tools.map((t) => this.toDto(t)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<ToolDto> {
    const tool = await this.prisma.tool.findUnique({ where: { id } });
    return this.toDto(assertWorkshopScoped(tool, actor, 'Herramienta no encontrada.'));
  }

  async update(
    id: string,
    dto: UpdateToolDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ToolDto> {
    const db = tx ?? this.prisma;
    const tool = assertWorkshopScoped(
      await db.tool.findUnique({ where: { id } }),
      actor,
      'Herramienta no encontrada.',
    );

    if (dto.assignedToUserId) {
      const technician = await db.user.findUnique({
        where: { id: dto.assignedToUserId },
      });
      if (!technician || technician.workshopId !== actor.workshopId || !technician.isActive) {
        throw new NotFoundException('Técnico asignado no encontrado o inactivo.');
      }
    }

    const updated = await db.tool.update({
      where: { id },
      data: {
        serialNumber: dto.serialNumber,
        name: dto.name,
        brand: dto.brand,
        description: dto.description,
        condition: dto.condition,
        status: dto.status,
        purchasePrice: dto.purchasePrice,
        assignedToUserId: dto.assignedToUserId,
        lastMaintenanceAt: dto.lastMaintenanceAt ? new Date(dto.lastMaintenanceAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Tool',
        entityId: id,
        action: 'TOOL_UPDATED',
        actorId: actor.id,
        before: { name: tool.name, status: tool.status },
        after: { name: updated.name, status: updated.status },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async setPhoto(
    id: string,
    file: Express.Multer.File,
    actor: RequestUser,
  ): Promise<ToolDto> {
    const tool = assertWorkshopScoped(
      await this.prisma.tool.findUnique({ where: { id } }),
      actor,
      'Herramienta no encontrada.',
    );

    if (tool.photoUrl) await this.storage.delete(tool.photoUrl);

    const key = `tools/${randomUUID()}${path.extname(file.originalname)}`;
    const photoUrl = await this.storage.upload(key, file.buffer, file.mimetype);
    const updated = await this.prisma.tool.update({
      where: { id },
      data: { photoUrl },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'Tool',
      entityId: id,
      action: 'TOOL_PHOTO_UPDATED',
      actorId: actor.id,
      before: { photoUrl: tool.photoUrl ?? null },
      after: { photoUrl },
    });

    return this.toDto(updated);
  }

  async deactivate(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    assertWorkshopScoped(
      await db.tool.findUnique({ where: { id } }),
      actor,
      'Herramienta no encontrada.',
    );

    await db.tool.update({ where: { id }, data: { isActive: false } });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Tool',
        entityId: id,
        action: 'TOOL_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  private toDto(tool: ToolRecord): ToolDto {
    return {
      id: tool.id,
      workshopId: tool.workshopId,
      serialNumber: tool.serialNumber ?? undefined,
      name: tool.name,
      brand: tool.brand ?? undefined,
      description: tool.description ?? undefined,
      condition: tool.condition,
      status: tool.status,
      purchasePrice: tool.purchasePrice?.toString() ?? undefined,
      assignedToUserId: tool.assignedToUserId ?? undefined,
      lastMaintenanceAt: tool.lastMaintenanceAt ?? undefined,
      notes: tool.notes ?? undefined,
      photoUrl: tool.photoUrl ?? undefined,
      isActive: tool.isActive,
      createdAt: tool.createdAt,
    };
  }
}
