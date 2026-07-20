import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { CustodyItemAlreadyReturnedException } from '@common/exceptions/domain.exceptions';
import { RequestUser } from '@common/types/request-user.type';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustodyItemDto } from './dto/create-custody-item.dto';
import { CustodyItemDto } from './dto/custody-item.dto';
import { ListCustodyQueryDto } from './dto/list-custody-query.dto';

type CustodyItemRecord = Awaited<
  ReturnType<PrismaService['custodyItem']['findUniqueOrThrow']>
>;

@Injectable()
export class CustodyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    private readonly storage: R2StorageService,
  ) {}

  async create(
    dto: CreateCustodyItemDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<CustodyItemDto> {
    const db = tx ?? this.prisma;

    await this.clients.assertActiveClient(dto.clientId, actor.workshopId, tx);

    if (dto.vehicleId) {
      assertWorkshopScoped(
        await db.vehicle.findUnique({ where: { id: dto.vehicleId } }),
        actor,
        'Vehículo no encontrado.',
      );
    }

    const responsible = await db.user.findUnique({
      where: { id: dto.responsibleUserId },
    });
    if (
      !responsible ||
      responsible.workshopId !== actor.workshopId ||
      !responsible.isActive
    )
      throw new NotFoundException('Usuario responsable no encontrado.');

    const item = await db.custodyItem.create({
      data: {
        workshopId: actor.workshopId,
        clientId: dto.clientId,
        vehicleId: dto.vehicleId,
        description: dto.description,
        workOrderCode: dto.workOrderCode,
        responsibleUserId: dto.responsibleUserId,
        notes: dto.notes,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'CustodyItem',
        entityId: item.id,
        action: 'CUSTODY_ITEM_REGISTERED',
        actorId: actor.id,
        after: { clientId: item.clientId, description: item.description },
      },
      tx,
    );

    return this.toDto(item);
  }

  async findAll(
    query: ListCustodyQueryDto,
    actor: RequestUser,
  ): Promise<{ data: CustodyItemDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustodyItemWhereInput = {
      workshopId: actor.workshopId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.isReturned !== undefined
        ? { isReturned: query.isReturned }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.custodyItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.custodyItem.count({ where }),
    ]);

    return { data: data.map((i) => this.toDto(i)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<CustodyItemDto> {
    const item = await this.prisma.custodyItem.findUnique({ where: { id } });
    return this.toDto(assertWorkshopScoped(item, actor));
  }

  async markReturned(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<CustodyItemDto> {
    const db = tx ?? this.prisma;
    const item = assertWorkshopScoped(
      await db.custodyItem.findUnique({ where: { id } }),
      actor,
    );
    if (item.isReturned) throw new CustodyItemAlreadyReturnedException();

    const updated = await db.custodyItem.update({
      where: { id },
      data: { isReturned: true, returnedAt: new Date() },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'CustodyItem',
        entityId: id,
        action: 'CUSTODY_ITEM_RETURNED',
        actorId: actor.id,
        before: { isReturned: false },
        after: { isReturned: true },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async setPhoto(
    id: string,
    file: Express.Multer.File,
    actor: RequestUser,
  ): Promise<CustodyItemDto> {
    const item = assertWorkshopScoped(
      await this.prisma.custodyItem.findUnique({ where: { id } }),
      actor,
    );

    if (item.photoUrl) await this.storage.delete(item.photoUrl);

    const key = `custody/${randomUUID()}${path.extname(file.originalname)}`;
    const photoUrl = await this.storage.upload(key, file.buffer, file.mimetype);
    const updated = await this.prisma.custodyItem.update({
      where: { id },
      data: { photoUrl },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'CustodyItem',
      entityId: id,
      action: 'CUSTODY_ITEM_PHOTO_UPDATED',
      actorId: actor.id,
      before: { photoUrl: item.photoUrl ?? null },
      after: { photoUrl },
    });

    return this.toDto(updated);
  }

  private toDto(item: CustodyItemRecord): CustodyItemDto {
    return {
      id: item.id,
      workshopId: item.workshopId,
      clientId: item.clientId,
      vehicleId: item.vehicleId ?? undefined,
      description: item.description,
      workOrderCode: item.workOrderCode ?? undefined,
      responsibleUserId: item.responsibleUserId ?? undefined,
      photoUrl: item.photoUrl ?? undefined,
      receivedAt: item.receivedAt,
      returnedAt: item.returnedAt ?? undefined,
      isReturned: item.isReturned,
      notes: item.notes ?? undefined,
      createdAt: item.createdAt,
    };
  }
}
