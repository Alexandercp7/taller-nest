import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommercialStatus,
  OperationalStatus,
  PhotoCategory,
  Prisma,
  Role,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatWorkOrderCode,
  parseWorkOrderCodeSeq,
} from './domain/work-order-code.generator';
import { assertOperationalTransition } from './domain/work-order-operational-state-machine';
import { ChangeOperationalStatusDto } from './dto/change-operational-status.dto';
import { CreateOtNoteDto } from './dto/create-ot-note.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { OtNoteDto } from './dto/ot-note.dto';
import { OtPhotoDto } from './dto/ot-photo.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderDto } from './dto/work-order.dto';

type WorkOrderWithDetails = Prisma.WorkOrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    serviceAdvisor: true;
    checklist: true;
    notes: true;
    photos: true;
    quotation: true;
  };
}>;

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: R2StorageService,
  ) {}

  async create(
    dto: CreateWorkOrderDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrderDto> {
    const db = tx ?? this.prisma;

    // 1. Validar que el cliente existe en el taller
    const client = await db.client.findFirst({
      where: { id: dto.clientId, workshopId: actor.workshopId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado en este taller.');
    }

    // 2. Validar que el vehículo existe en el taller y pertenece al cliente
    const vehicle = await db.vehicle.findFirst({
      where: { id: dto.vehicleId, workshopId: actor.workshopId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado en este taller.');
    }
    if (vehicle.clientId !== client.id) {
      throw new BadRequestException(
        'El vehículo seleccionado no pertenece al cliente especificado.',
      );
    }

    // 3. Resolver asesor de servicio
    const serviceAdvisorId = dto.serviceAdvisorId ?? actor.id;

    // 4. Generar código secuencial para el taller (OT-0001, etc.)
    const code = await this.generateNextCode(actor.workshopId, db);

    // 5. Crear la orden de trabajo junto con su checklist y cotización inicial
    const created = await db.workOrder.create({
      data: {
        workshopId: actor.workshopId,
        code,
        clientId: client.id,
        vehicleId: vehicle.id,
        serviceAdvisorId,
        mileageIn: dto.mileageIn,
        fuelLevel: dto.fuelLevel,
        failureDescription: dto.failureDescription,
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : undefined,
        checklist: dto.checklist
          ? {
              create: {
                hasKeys: dto.checklist.hasKeys ?? true,
                hasSpareTire: dto.checklist.hasSpareTire ?? false,
                hasJack: dto.checklist.hasJack ?? false,
                hasTools: dto.checklist.hasTools ?? false,
                hasExtinguisher: dto.checklist.hasExtinguisher ?? false,
                exteriorDamage: dto.checklist.exteriorDamage as Prisma.InputJsonValue,
                personalItems: dto.checklist.personalItems,
                notes: dto.checklist.notes,
              },
            }
          : undefined,
        quotation: {
          create: {},
        },
      },
      include: {
        client: true,
        vehicle: true,
        serviceAdvisor: true,
        checklist: true,
        notes: true,
        photos: true,
        quotation: true,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'WorkOrder',
        entityId: created.id,
        action: 'WORK_ORDER_CREATED',
        actorId: actor.id,
        after: {
          code: created.code,
          clientId: created.clientId,
          vehicleId: created.vehicleId,
          operationalStatus: created.operationalStatus,
        },
      },
      tx,
    );

    return this.toDto(created);
  }

  async findAll(
    query: ListWorkOrdersQueryDto,
    actor: RequestUser,
  ): Promise<{ data: WorkOrderDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {
      workshopId: actor.workshopId,
      ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
      ...(query.commercialStatus ? { commercialStatus: query.commercialStatus } : {}),
      ...(query.serviceAdvisorId ? { serviceAdvisorId: query.serviceAdvisorId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.estaRetrasada !== undefined
        ? { estaRetrasada: query.estaRetrasada }
        : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { client: { name: { contains: query.search, mode: 'insensitive' } } },
              { vehicle: { plate: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          client: true,
          vehicle: true,
          serviceAdvisor: true,
          checklist: true,
          notes: true,
          photos: true,
          quotation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      total,
    };
  }

  async findOne(id: string, actor: RequestUser): Promise<WorkOrderDto> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, workshopId: actor.workshopId },
      include: {
        client: true,
        vehicle: true,
        serviceAdvisor: true,
        checklist: true,
        notes: {
          orderBy: { createdAt: 'asc' },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        quotation: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Orden de trabajo con id '${id}' no encontrada.`);
    }

    return this.toDto(workOrder);
  }

  async update(
    id: string,
    dto: UpdateWorkOrderDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrderDto> {
    const db = tx ?? this.prisma;
    const existing = await this.findOrderOrThrow(id, actor.workshopId, db);

    const updated = await db.workOrder.update({
      where: { id },
      data: {
        failureDescription: dto.failureDescription ?? existing.failureDescription,
        diagnosis: dto.diagnosis !== undefined ? dto.diagnosis : existing.diagnosis,
        serviceAdvisorId: dto.serviceAdvisorId ?? existing.serviceAdvisorId,
        mileageIn: dto.mileageIn !== undefined ? dto.mileageIn : existing.mileageIn,
        fuelLevel: dto.fuelLevel !== undefined ? dto.fuelLevel : existing.fuelLevel,
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : existing.estimatedDelivery,
      },
      include: {
        client: true,
        vehicle: true,
        serviceAdvisor: true,
        checklist: true,
        notes: true,
        photos: true,
        quotation: true,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'WorkOrder',
        entityId: id,
        action: 'WORK_ORDER_UPDATED',
        actorId: actor.id,
        before: { diagnosis: existing.diagnosis },
        after: { diagnosis: updated.diagnosis },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async changeOperationalStatus(
    id: string,
    dto: ChangeOperationalStatusDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrderDto> {
    const db = tx ?? this.prisma;
    const existing = await this.findOrderOrThrow(id, actor.workshopId, db);

    // 1. Validar máquina de estados finita
    assertOperationalTransition(existing.operationalStatus, dto.status);

    // 2. Control de roles: Un TECHNICIAN no puede cambiar a estados de entrega, cierre o cancelación
    if (
      actor.role === Role.TECHNICIAN &&
      ([
        OperationalStatus.ENTREGADA,
        OperationalStatus.CERRADA,
        OperationalStatus.CANCELADA,
      ] as readonly OperationalStatus[]).includes(dto.status)
    ) {
      throw new ForbiddenException(
        'Los técnicos no tienen permiso para entregar, cerrar o cancelar órdenes de trabajo.',
      );
    }

    const dataToUpdate: Prisma.WorkOrderUpdateInput = {
      operationalStatus: dto.status,
    };

    if (dto.status === OperationalStatus.ENTREGADA) {
      dataToUpdate.deliveredAt = new Date();
    }
    if (dto.status === OperationalStatus.CERRADA) {
      dataToUpdate.closedAt = new Date();
    }
    if (dto.status === OperationalStatus.CANCELADA) {
      dataToUpdate.cancelledAt = new Date();
      dataToUpdate.cancelReason = dto.cancelReason;
    }

    // Si pasa a reparación y ya estaba aprobada, avanzar estado comercial a EN_EJECUCION
    if (
      dto.status === OperationalStatus.EN_REPARACION &&
      ([
        CommercialStatus.APROBADA_TOTAL,
        CommercialStatus.APROBADA_PARCIAL,
      ] as readonly CommercialStatus[]).includes(existing.commercialStatus)
    ) {
      dataToUpdate.commercialStatus = CommercialStatus.EN_EJECUCION;
    }

    const updated = await db.workOrder.update({
      where: { id },
      data: dataToUpdate,
      include: {
        client: true,
        vehicle: true,
        serviceAdvisor: true,
        checklist: true,
        notes: true,
        photos: true,
        quotation: true,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'WorkOrder',
        entityId: id,
        action: 'WORK_ORDER_STATUS_CHANGED',
        actorId: actor.id,
        before: { operationalStatus: existing.operationalStatus },
        after: { operationalStatus: updated.operationalStatus },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async toggleDelayed(
    id: string,
    estaRetrasada: boolean,
    actor: RequestUser,
  ): Promise<WorkOrderDto> {
    const existing = await this.findOrderOrThrow(id, actor.workshopId);

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { estaRetrasada },
      include: {
        client: true,
        vehicle: true,
        serviceAdvisor: true,
        checklist: true,
        notes: true,
        photos: true,
        quotation: true,
      },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'WORK_ORDER_DELAY_TOGGLED',
      actorId: actor.id,
      before: { estaRetrasada: existing.estaRetrasada },
      after: { estaRetrasada },
    });

    return this.toDto(updated);
  }

  async addNote(
    id: string,
    dto: CreateOtNoteDto,
    actor: RequestUser,
  ): Promise<OtNoteDto> {
    await this.findOrderOrThrow(id, actor.workshopId);

    const note = await this.prisma.otNote.create({
      data: {
        workOrderId: id,
        userId: actor.id,
        content: dto.content,
        isClientVisible: dto.isClientVisible ?? false,
      },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'WORK_ORDER_NOTE_ADDED',
      actorId: actor.id,
      after: {
        noteId: note.id,
        isClientVisible: note.isClientVisible,
      },
    });

    return {
      id: note.id,
      workOrderId: note.workOrderId,
      userId: note.userId,
      content: note.content,
      isClientVisible: note.isClientVisible,
      createdAt: note.createdAt.toISOString(),
    };
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    category: PhotoCategory,
    isPublic: boolean,
    caption: string | undefined,
    actor: RequestUser,
  ): Promise<OtPhotoDto> {
    await this.findOrderOrThrow(id, actor.workshopId);

    const key = `work-orders/${id}/${randomUUID()}${path.extname(file.originalname)}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    const photo = await this.prisma.otPhoto.create({
      data: {
        workOrderId: id,
        userId: actor.id,
        category,
        url,
        caption,
        isPublic,
      },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'WORK_ORDER_PHOTO_ADDED',
      actorId: actor.id,
      after: {
        photoId: photo.id,
        category: photo.category,
        url: photo.url,
      },
    });

    return {
      id: photo.id,
      workOrderId: photo.workOrderId,
      userId: photo.userId,
      category: photo.category,
      url: photo.url,
      caption: photo.caption,
      isPublic: photo.isPublic,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  async remove(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const existing = await this.findOrderOrThrow(id, actor.workshopId, db);

    // Invariante de negocio: solo se borra en RECIBIDA o CANCELADA
    if (
      existing.operationalStatus !== OperationalStatus.RECIBIDA &&
      existing.operationalStatus !== OperationalStatus.CANCELADA
    ) {
      throw new BadRequestException(
        `No se puede eliminar una orden de trabajo en estado '${existing.operationalStatus}'. Solo está permitido en RECIBIDA o CANCELADA.`,
      );
    }

    await db.workOrder.delete({
      where: { id },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'WorkOrder',
        entityId: id,
        action: 'WORK_ORDER_DELETED',
        actorId: actor.id,
        before: { code: existing.code },
      },
      tx,
    );
  }

  private async generateNextCode(
    workshopId: string,
    db: PrismaService | Prisma.TransactionClient,
  ): Promise<string> {
    const latest = await db.workOrder.findFirst({
      where: { workshopId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    if (!latest) {
      return formatWorkOrderCode(1);
    }

    const currentSeq = parseWorkOrderCodeSeq(latest.code);
    if (currentSeq !== null) {
      return formatWorkOrderCode(currentSeq + 1);
    }

    const count = await db.workOrder.count({ where: { workshopId } });
    return formatWorkOrderCode(count + 1);
  }

  private async findOrderOrThrow(
    id: string,
    workshopId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const order = await db.workOrder.findUnique({
      where: { id },
    });
    return assertWorkshopScoped(order, { workshopId }, 'Orden de trabajo no encontrada.');
  }

  private toDto(record: WorkOrderWithDetails): WorkOrderDto {
    return {
      id: record.id,
      workshopId: record.workshopId,
      code: record.code,
      clientId: record.clientId,
      clientName: record.client ? record.client.name : undefined,
      vehicleId: record.vehicleId,
      vehicleDescription: record.vehicle
        ? `${record.vehicle.make} ${record.vehicle.model} ${record.vehicle.year} (${record.vehicle.plate})`
        : undefined,
      serviceAdvisorId: record.serviceAdvisorId,
      serviceAdvisorName: record.serviceAdvisor
        ? `${record.serviceAdvisor.firstName} ${record.serviceAdvisor.lastName}`
        : undefined,
      operationalStatus: record.operationalStatus,
      commercialStatus: record.commercialStatus,
      billingStatus: record.billingStatus,
      estaRetrasada: record.estaRetrasada,
      portalToken: record.portalToken,
      mileageIn: record.mileageIn,
      fuelLevel: record.fuelLevel,
      failureDescription: record.failureDescription,
      diagnosis: record.diagnosis,
      estimatedDelivery: record.estimatedDelivery
        ? record.estimatedDelivery.toISOString()
        : null,
      deliveredAt: record.deliveredAt ? record.deliveredAt.toISOString() : null,
      closedAt: record.closedAt ? record.closedAt.toISOString() : null,
      cancelledAt: record.cancelledAt ? record.cancelledAt.toISOString() : null,
      cancelReason: record.cancelReason,
      checklist: record.checklist
        ? {
            id: record.checklist.id,
            workOrderId: record.checklist.workOrderId,
            hasKeys: record.checklist.hasKeys,
            hasSpareTire: record.checklist.hasSpareTire,
            hasJack: record.checklist.hasJack,
            hasTools: record.checklist.hasTools,
            hasExtinguisher: record.checklist.hasExtinguisher,
            exteriorDamage: record.checklist.exteriorDamage,
            personalItems: record.checklist.personalItems,
            notes: record.checklist.notes,
            createdAt: record.checklist.createdAt.toISOString(),
          }
        : null,
      notes: (record.notes ?? []).map((n) => ({
        id: n.id,
        workOrderId: n.workOrderId,
        userId: n.userId,
        content: n.content,
        isClientVisible: n.isClientVisible,
        createdAt: n.createdAt.toISOString(),
      })),
      photos: (record.photos ?? []).map((p) => ({
        id: p.id,
        workOrderId: p.workOrderId,
        userId: p.userId,
        category: p.category,
        url: p.url,
        caption: p.caption,
        isPublic: p.isPublic,
        createdAt: p.createdAt.toISOString(),
      })),
      quotationTotal: record.quotation ? record.quotation.total.toString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
