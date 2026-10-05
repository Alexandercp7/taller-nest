import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommercialStatus,
  OperationalStatus,
  Prisma,
  QuotationApprovalStatus,
  QuotationLineType,
  Role,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import { resolveServicePrice } from '../services/domain/service-price.resolver';
import {
  calculateQuotation,
  resolveClientApprovalStatus,
} from './domain/quotation-calculator';
import { ApproveQuotationLinesDto } from './dto/approve-quotation-lines.dto';
import { CreateQuotationLineDto } from './dto/create-quotation-line.dto';
import { OverrideLinePriceDto } from './dto/override-line-price.dto';
import { QuotationLineDto } from './dto/quotation-line.dto';
import { QuotationDto } from './dto/quotation.dto';
import { SetQuotationDiscountDto } from './dto/set-quotation-discount.dto';
import { UpdateQuotationLineDto } from './dto/update-quotation-line.dto';

type QuotationWithLines = Prisma.QuotationGetPayload<{
  include: { lines: true };
}>;

type QuotationLineRecord = Prisma.QuotationLineGetPayload<object>;

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getQuotationByWorkOrder(
    workOrderId: string,
    actor: RequestUser,
  ): Promise<QuotationDto> {
    const workOrder = await this.findWorkOrderOrThrow(workOrderId, actor.workshopId);

    const quotation = await this.prisma.quotation.findUnique({
      where: { workOrderId: workOrder.id },
      include: {
        lines: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada para esta orden de trabajo.');
    }

    return this.toDto(quotation);
  }

  async addLine(
    workOrderId: string,
    dto: CreateQuotationLineDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<QuotationLineDto> {
    const db = tx ?? this.prisma;
    const workOrder = await this.findWorkOrderOrThrow(workOrderId, actor.workshopId, db);

    const quotation = await db.quotation.findUnique({
      where: { workOrderId: workOrder.id },
      include: { lines: true },
    });
    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    let concept = dto.concept;
    let unitPrice = dto.unitPrice;

    // 1. Auto-resolución de servicio
    if (dto.lineType === QuotationLineType.SERVICE && dto.serviceId) {
      const service = await db.service.findFirst({
        where: { id: dto.serviceId, workshopId: actor.workshopId },
        include: { prices: true },
      });
      if (!service) {
        throw new NotFoundException(`Servicio con id '${dto.serviceId}' no encontrado.`);
      }
      if (!concept) concept = service.concept;
      if (!unitPrice) {
        const vehicle = await db.vehicle.findUnique({ where: { id: workOrder.vehicleId } });
        const resolved = resolveServicePrice(service, vehicle?.km ? undefined : undefined);
        unitPrice = resolved ?? (service.basePrice ? service.basePrice.toString() : '0.00');
      }
    }

    // 2. Auto-resolución de refacción
    if (dto.lineType === QuotationLineType.PART && dto.articleId) {
      const article = await db.article.findFirst({
        where: { id: dto.articleId, workshopId: actor.workshopId },
      });
      if (!article) {
        throw new NotFoundException(`Refacción con id '${dto.articleId}' no encontrada.`);
      }
      if (!concept) concept = article.name;
      if (!unitPrice) {
        unitPrice = article.salePrice ? article.salePrice.toString() : '0.00';
      }
    }

    if (!concept) {
      throw new BadRequestException('El concepto de la línea es obligatorio.');
    }
    if (!unitPrice) {
      unitPrice = '0.00';
    }

    const finalPrice = dto.finalPrice ?? unitPrice;
    const quantity = dto.quantity ?? 1;

    // 3. Crear línea de cotización
    const line = await db.quotationLine.create({
      data: {
        quotationId: quotation.id,
        lineType: dto.lineType,
        serviceId: dto.serviceId,
        articleId: dto.articleId,
        concept,
        quantity,
        unitPrice,
        finalPrice,
        reQuotedFromLineId: dto.reQuotedFromLineId,
      },
    });

    // 4. Recalcular cotización
    const allLines = [...quotation.lines, line];
    const calc = calculateQuotation({
      lines: allLines,
      discountType: quotation.discountType,
      discountValue: quotation.discountValue,
      aplicaIva: quotation.aplicaIva,
    });

    await db.quotation.update({
      where: { id: quotation.id },
      data: {
        subtotal: calc.subtotal,
        taxAmount: calc.taxAmount,
        total: calc.total,
      },
    });

    // 5. Avanzar estados de la OT si corresponde
    if (workOrder.commercialStatus === CommercialStatus.SIN_COTIZAR) {
      await db.workOrder.update({
        where: { id: workOrder.id },
        data: { commercialStatus: CommercialStatus.COTIZADA },
      });
    }
    if (workOrder.operationalStatus === OperationalStatus.EN_ESPERA_COTIZACION) {
      await db.workOrder.update({
        where: { id: workOrder.id },
        data: { operationalStatus: OperationalStatus.EN_ESPERA_APROBACION },
      });
    }

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Quotation',
        entityId: quotation.id,
        action: 'QUOTATION_LINE_ADDED',
        actorId: actor.id,
        after: {
          lineId: line.id,
          concept: line.concept,
          finalPrice: line.finalPrice.toString(),
          total: calc.total.toString(),
        },
      },
      tx,
    );

    return this.toLineDto(line);
  }

  async updateLine(
    workOrderId: string,
    lineId: string,
    dto: UpdateQuotationLineDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<QuotationLineDto> {
    const db = tx ?? this.prisma;
    const quotation = await this.findQuotationWithLinesOrThrow(workOrderId, actor.workshopId, db);

    const existingLine = quotation.lines.find((l) => l.id === lineId);
    if (!existingLine) {
      throw new NotFoundException(`Línea con id '${lineId}' no encontrada en la cotización.`);
    }

    const updatedLine = await db.quotationLine.update({
      where: { id: lineId },
      data: {
        concept: dto.concept ?? existingLine.concept,
        quantity: dto.quantity ?? existingLine.quantity,
        unitPrice: dto.unitPrice ?? existingLine.unitPrice,
        finalPrice: dto.finalPrice ?? existingLine.finalPrice,
      },
    });

    const otherLines = quotation.lines.filter((l) => l.id !== lineId);
    await this.recalculateAndUpdate(quotation, [...otherLines, updatedLine], db);

    return this.toLineDto(updatedLine);
  }

  async overridePrice(
    workOrderId: string,
    lineId: string,
    dto: OverrideLinePriceDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<QuotationLineDto> {
    const db = tx ?? this.prisma;
    if (actor.role === Role.TECHNICIAN) {
      throw new ForbiddenException(
        'Los técnicos no tienen permiso para autorizar ajustes de precio en cotización.',
      );
    }

    const quotation = await this.findQuotationWithLinesOrThrow(workOrderId, actor.workshopId, db);
    const existingLine = quotation.lines.find((l) => l.id === lineId);
    if (!existingLine) {
      throw new NotFoundException(`Línea con id '${lineId}' no encontrada.`);
    }

    const updatedLine = await db.quotationLine.update({
      where: { id: lineId },
      data: {
        finalPrice: dto.finalPrice,
        priceOverrideReason: dto.reason,
        priceOverrideById: actor.id,
      },
    });

    const otherLines = quotation.lines.filter((l) => l.id !== lineId);
    await this.recalculateAndUpdate(quotation, [...otherLines, updatedLine], db);

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'QuotationLine',
        entityId: lineId,
        action: 'QUOTATION_PRICE_OVERRIDDEN',
        actorId: actor.id,
        before: { finalPrice: existingLine.finalPrice.toString() },
        after: { finalPrice: dto.finalPrice, reason: dto.reason },
      },
      tx,
    );

    return this.toLineDto(updatedLine);
  }

  async approveLines(
    workOrderId: string,
    dto: ApproveQuotationLinesDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<QuotationDto> {
    const db = tx ?? this.prisma;
    const quotation = await this.findQuotationWithLinesOrThrow(workOrderId, actor.workshopId, db);

    for (const decision of dto.decisions) {
      await db.quotationLine.update({
        where: { id: decision.lineId },
        data: {
          approvalStatus: decision.status,
          rejectionReason:
            decision.status === QuotationApprovalStatus.REJECTED
              ? decision.rejectionReason
              : null,
        },
      });
    }

    const updatedQuotation = await db.quotation.findUniqueOrThrow({
      where: { id: quotation.id },
      include: { lines: true },
    });

    const approvalStatus = resolveClientApprovalStatus(updatedQuotation.lines);

    const finalQuotation = await db.quotation.update({
      where: { id: quotation.id },
      data: {
        clientApprovalStatus: approvalStatus,
        approvedAt:
          approvalStatus === QuotationApprovalStatus.APPROVED ? new Date() : null,
      },
      include: { lines: true },
    });

    // Actualizar estado comercial en WorkOrder
    if (approvalStatus === QuotationApprovalStatus.APPROVED) {
      const allApproved = updatedQuotation.lines.every(
        (l) => l.approvalStatus === QuotationApprovalStatus.APPROVED,
      );
      await db.workOrder.update({
        where: { id: workOrderId },
        data: {
          commercialStatus: allApproved
            ? CommercialStatus.APROBADA_TOTAL
            : CommercialStatus.APROBADA_PARCIAL,
        },
      });
    }

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Quotation',
        entityId: quotation.id,
        action: 'QUOTATION_APPROVAL_REGISTERED',
        actorId: actor.id,
        after: { clientApprovalStatus: approvalStatus },
      },
      tx,
    );

    return this.toDto(finalQuotation);
  }

  async setDiscount(
    workOrderId: string,
    dto: SetQuotationDiscountDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<QuotationDto> {
    const db = tx ?? this.prisma;
    const quotation = await this.findQuotationWithLinesOrThrow(workOrderId, actor.workshopId, db);

    const calc = calculateQuotation({
      lines: quotation.lines,
      discountType: dto.discountType !== undefined ? dto.discountType : quotation.discountType,
      discountValue: dto.discountValue !== undefined ? dto.discountValue : quotation.discountValue,
      aplicaIva: dto.aplicaIva !== undefined ? dto.aplicaIva : quotation.aplicaIva,
    });

    const updated = await db.quotation.update({
      where: { id: quotation.id },
      data: {
        discountType: dto.discountType !== undefined ? dto.discountType : quotation.discountType,
        discountValue: dto.discountValue !== undefined ? dto.discountValue : quotation.discountValue,
        aplicaIva: dto.aplicaIva !== undefined ? dto.aplicaIva : quotation.aplicaIva,
        subtotal: calc.subtotal,
        taxAmount: calc.taxAmount,
        total: calc.total,
      },
      include: { lines: true },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Quotation',
        entityId: quotation.id,
        action: 'QUOTATION_DISCOUNT_UPDATED',
        actorId: actor.id,
        after: {
          discountType: updated.discountType,
          discountValue: updated.discountValue?.toString(),
          total: updated.total.toString(),
        },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async removeLine(
    workOrderId: string,
    lineId: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const quotation = await this.findQuotationWithLinesOrThrow(workOrderId, actor.workshopId, db);

    const line = quotation.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException(`Línea con id '${lineId}' no encontrada.`);
    }

    await db.quotationLine.delete({
      where: { id: lineId },
    });

    const remaining = quotation.lines.filter((l) => l.id !== lineId);
    await this.recalculateAndUpdate(quotation, remaining, db);

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Quotation',
        entityId: quotation.id,
        action: 'QUOTATION_LINE_REMOVED',
        actorId: actor.id,
        before: { lineId, concept: line.concept },
      },
      tx,
    );
  }

  private async recalculateAndUpdate(
    quotation: QuotationWithLines,
    lines: QuotationLineRecord[],
    db: PrismaService | Prisma.TransactionClient,
  ) {
    const calc = calculateQuotation({
      lines,
      discountType: quotation.discountType,
      discountValue: quotation.discountValue,
      aplicaIva: quotation.aplicaIva,
    });

    await db.quotation.update({
      where: { id: quotation.id },
      data: {
        subtotal: calc.subtotal,
        taxAmount: calc.taxAmount,
        total: calc.total,
      },
    });
  }

  private async findWorkOrderOrThrow(
    workOrderId: string,
    workshopId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const order = await db.workOrder.findUnique({
      where: { id: workOrderId },
    });
    return assertWorkshopScoped(order, { workshopId }, 'Orden de trabajo no encontrada.');
  }

  private async findQuotationWithLinesOrThrow(
    workOrderId: string,
    workshopId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<QuotationWithLines> {
    await this.findWorkOrderOrThrow(workOrderId, workshopId, db);
    const quotation = await db.quotation.findUnique({
      where: { workOrderId },
      include: { lines: true },
    });
    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada para esta orden de trabajo.');
    }
    return quotation;
  }

  private toDto(record: QuotationWithLines): QuotationDto {
    return {
      id: record.id,
      workOrderId: record.workOrderId,
      subtotal: record.subtotal.toString(),
      discountType: record.discountType,
      discountValue: record.discountValue ? record.discountValue.toString() : null,
      aplicaIva: record.aplicaIva,
      taxAmount: record.taxAmount.toString(),
      total: record.total.toString(),
      clientApprovalStatus: record.clientApprovalStatus,
      approvedAt: record.approvedAt ? record.approvedAt.toISOString() : null,
      lines: (record.lines ?? []).map((l) => this.toLineDto(l)),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toLineDto(line: QuotationLineRecord): QuotationLineDto {
    return {
      id: line.id,
      quotationId: line.quotationId,
      lineType: line.lineType,
      serviceId: line.serviceId,
      articleId: line.articleId,
      concept: line.concept,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toString(),
      finalPrice: line.finalPrice.toString(),
      priceOverrideReason: line.priceOverrideReason,
      priceOverrideById: line.priceOverrideById,
      approvalStatus: line.approvalStatus,
      rejectionReason: line.rejectionReason,
      reQuotedFromLineId: line.reQuotedFromLineId,
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString(),
    };
  }
}
