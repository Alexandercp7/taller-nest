import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingStatus,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Prisma,
  QuotationApprovalStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { FiscalDataValidator } from './domain/fiscal-data-validator';
import { InvoiceNumberGenerator } from './domain/invoice-number-generator';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { EmitInvoiceDto } from './dto/emit-invoice.dto';
import { InvoiceDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import {
  PendingInvoiceItemDto,
  FiscalValidationSummaryDto,
} from './dto/pending-invoice-item.dto';
import { PendingInvoicesQueryDto } from './dto/pending-invoices-query.dto';
import { UpdateFiscalDataDto } from './dto/update-fiscal-data.dto';

type InvoiceWithRelations = Invoice & {
  items: InvoiceItem[];
  workOrder: { code: string };
  issuedBy: { firstName: string; lastName: string };
  cancelledBy?: { firstName: string; lastName: string } | null;
};

@Injectable()
export class InvoicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Obtiene la bandeja de órdenes de trabajo pendientes de facturar.
   */
  async getPendingQueue(
    query: PendingInvoicesQueryDto,
    actor: RequestUser,
  ): Promise<{
    data: PendingInvoiceItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {
      workshopId: actor.workshopId,
      billingStatus: query.status
        ? query.status
        : {
            in: [
              BillingStatus.PENDIENTE_DATOS,
              BillingStatus.LISTA_PARA_FACTURAR,
            ],
          },
    };

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { client: { name: { contains: s, mode: 'insensitive' } } },
        { client: { rfc: { contains: s, mode: 'insensitive' } } },
        { client: { phone: { contains: s, mode: 'insensitive' } } },
        { vehicle: { plate: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: true,
          vehicle: true,
          commercialClose: true,
          quotation: {
            include: {
              lines: {
                where: { approvalStatus: QuotationApprovalStatus.APPROVED },
              },
            },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    const data: PendingInvoiceItemDto[] = workOrders.map((wo) => {
      const fiscalVal = FiscalDataValidator.validate({
        rfc: wo.client.rfc,
        businessName: wo.client.businessName || wo.client.name,
        zipCode: wo.client.zipCode,
        taxRegime: wo.client.taxRegime,
        cfdiUse: wo.client.cfdiUse,
      });

      const validationSummary: FiscalValidationSummaryDto = {
        isValid: fiscalVal.isValid,
        missingFields: fiscalVal.missingFields,
        errors: fiscalVal.errors,
      };

      const quotationSubtotal = wo.quotation
        ? Number(wo.quotation.subtotal)
        : Number(wo.commercialClose?.frozenTotal ?? 0);
      const quotationTax = wo.quotation
        ? Number(wo.quotation.taxAmount)
        : Number((quotationSubtotal * 0.16).toFixed(2));
      const quotationTotal = wo.quotation
        ? Number(wo.quotation.total)
        : Number(wo.commercialClose?.frozenTotal ?? 0);

      return {
        workOrderId: wo.id,
        code: wo.code,
        billingStatus: wo.billingStatus,
        subtotal: quotationSubtotal,
        taxAmount: quotationTax,
        total: quotationTotal,
        closedAt: wo.commercialClose?.closedAt ?? wo.closedAt,
        client: {
          id: wo.client.id,
          name: wo.client.name,
          phone: wo.client.phone,
          email: wo.client.email,
          rfc: wo.client.rfc,
          businessName: wo.client.businessName,
          zipCode: wo.client.zipCode,
          taxRegime: wo.client.taxRegime,
          cfdiUse: wo.client.cfdiUse,
        },
        vehicle: {
          id: wo.vehicle.id,
          plate: wo.vehicle.plate,
          make: wo.vehicle.make,
          model: wo.vehicle.model,
          year: wo.vehicle.year,
        },
        fiscalValidation: validationSummary,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Actualiza los datos fiscales del cliente y orden, transicionando a LISTA_PARA_FACTURAR si son válidos.
   */
  async updateFiscalData(
    workOrderId: string,
    dto: UpdateFiscalDataDto,
    actor: RequestUser,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, workshopId: actor.workshopId },
      include: { client: true },
    });

    if (!wo) {
      throw new NotFoundException(
        `Orden de trabajo con id '${workOrderId}' no encontrada.`,
      );
    }

    const validation = FiscalDataValidator.validate(dto);
    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Los datos fiscales proporcionados no son válidos para el SAT.',
        errors: validation.errors,
        missingFields: validation.missingFields,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar maestro del cliente
      if (dto.applyToClient !== false && wo.clientId) {
        await tx.client.update({
          where: { id: wo.clientId },
          data: {
            rfc: validation.normalizedRfc,
            businessName: dto.businessName.trim(),
            zipCode: validation.normalizedZipCode,
            taxRegime: validation.normalizedTaxRegime,
            cfdiUse: validation.normalizedCfdiUse,
          },
        });
      }

      // 2. Transicionar estatus de facturación si estaba pendiente
      let newBillingStatus = wo.billingStatus;
      if (
        wo.billingStatus === BillingStatus.PENDIENTE_DATOS ||
        wo.billingStatus === BillingStatus.CANCELADA
      ) {
        newBillingStatus = BillingStatus.LISTA_PARA_FACTURAR;
        await tx.workOrder.update({
          where: { id: wo.id },
          data: { billingStatus: newBillingStatus },
        });
      }

      // 3. Registrar auditoría
      await this.audit.log(
        {
          workshopId: actor.workshopId,
          entityType: 'WorkOrder',
          entityId: wo.id,
          action: 'FISCAL_DATA_UPDATED',
          actorId: actor.id,
          after: {
            rfc: validation.normalizedRfc,
            businessName: dto.businessName.trim(),
            zipCode: validation.normalizedZipCode,
            taxRegime: validation.normalizedTaxRegime,
            cfdiUse: validation.normalizedCfdiUse,
            billingStatus: newBillingStatus,
          },
        },
        tx,
      );

      return {
        success: true,
        workOrderId: wo.id,
        billingStatus: newBillingStatus,
        fiscalData: {
          rfc: validation.normalizedRfc,
          businessName: dto.businessName.trim(),
          zipCode: validation.normalizedZipCode,
          taxRegime: validation.normalizedTaxRegime,
          cfdiUse: validation.normalizedCfdiUse,
        },
      };
    });
  }

  /**
   * Emite una factura interna con snapshot inmutable, líneas y folio consecutivo.
   */
  async emitInvoice(
    workOrderId: string,
    dto: EmitInvoiceDto,
    actor: RequestUser,
  ): Promise<InvoiceDto> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, workshopId: actor.workshopId },
      include: {
        client: true,
        commercialClose: true,
        invoice: true,
        quotation: {
          include: {
            lines: {
              where: { approvalStatus: QuotationApprovalStatus.APPROVED },
            },
          },
        },
      },
    });

    if (!wo) {
      throw new NotFoundException(
        `Orden de trabajo con id '${workOrderId}' no encontrada.`,
      );
    }

    if (wo.invoice && wo.invoice.status === InvoiceStatus.ISSUED) {
      throw new BadRequestException(
        `La orden de trabajo ya cuenta con una factura emitida activa (${wo.invoice.invoiceNumber}).`,
      );
    }

    if (wo.billingStatus !== BillingStatus.LISTA_PARA_FACTURAR) {
      throw new BadRequestException(
        `La orden no está lista para facturar (estatus actual: ${wo.billingStatus}). Requiere validar datos fiscales primero.`,
      );
    }

    const fiscalValidation = FiscalDataValidator.validate({
      rfc: wo.client.rfc,
      businessName: wo.client.businessName || wo.client.name,
      zipCode: wo.client.zipCode,
      taxRegime: wo.client.taxRegime,
      cfdiUse: wo.client.cfdiUse,
    });

    if (!fiscalValidation.isValid) {
      throw new BadRequestException({
        message: 'Los datos fiscales del cliente son incompletos o inválidos.',
        errors: fiscalValidation.errors,
        missingFields: fiscalValidation.missingFields,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener siguiente folio correlativo para el taller
      const lastInvoice = await tx.invoice.findFirst({
        where: { workshopId: actor.workshopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextSeq = 1;
      if (lastInvoice?.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }
      const invoiceNumber = InvoiceNumberGenerator.formatInvoiceNumber(
        nextSeq,
        'FAC',
      );

      // 2. Preparar conceptos de factura desde cotización o fallback
      const approvedLines = wo.quotation?.lines ?? [];
      const invoiceItems =
        approvedLines.length > 0
          ? approvedLines.map((line) => {
              const sub = Number(line.finalPrice);
              const tax = Number((sub * 0.16).toFixed(2));
              return {
                concept: line.concept,
                quantity: line.quantity,
                unitPrice: Number(line.unitPrice),
                subtotal: sub,
                taxAmount: tax,
                total: Number((sub + tax).toFixed(2)),
                satProductCode: '78181500',
                satUnitCode: 'E48',
              };
            })
          : [
              {
                concept: `Servicio de reparación automotriz - Orden ${wo.code}`,
                quantity: 1,
                unitPrice: Number(wo.commercialClose?.frozenTotal ?? 0),
                subtotal: Number(wo.commercialClose?.frozenTotal ?? 0),
                taxAmount: Number(
                  (Number(wo.commercialClose?.frozenTotal ?? 0) * 0.16).toFixed(
                    2,
                  ),
                ),
                total: Number(
                  (
                    Number(wo.commercialClose?.frozenTotal ?? 0) * 1.16
                  ).toFixed(2),
                ),
                satProductCode: '78181500',
                satUnitCode: 'E48',
              },
            ];

      const subtotal = invoiceItems.reduce((acc, i) => acc + i.subtotal, 0);
      const taxAmount = invoiceItems.reduce((acc, i) => acc + i.taxAmount, 0);
      const total = Number((subtotal + taxAmount).toFixed(2));
      const simulatedUuid = randomUUID();

      // 3. Crear registro inmutable de Factura
      const createdInvoice = await tx.invoice.create({
        data: {
          workshopId: actor.workshopId,
          workOrderId: wo.id,
          clientId: wo.clientId,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          receiverRfc: fiscalValidation.normalizedRfc!,
          receiverName: (wo.client.businessName || wo.client.name).trim(),
          receiverZipCode: fiscalValidation.normalizedZipCode!,
          receiverTaxRegime: fiscalValidation.normalizedTaxRegime!,
          cfdiUse: fiscalValidation.normalizedCfdiUse || 'G03',
          paymentMethodSat: dto.paymentMethodSat || 'PUE',
          subtotal,
          discountAmount: Number(wo.quotation?.discountValue || 0),
          taxAmount,
          total,
          uuid: simulatedUuid,
          notes: dto.notes,
          issuedById: actor.id,
          items: {
            create: invoiceItems,
          },
        },
        include: {
          items: true,
          workOrder: { select: { code: true } },
          issuedBy: { select: { firstName: true, lastName: true } },
        },
      });

      // 4. Actualizar estatus de facturación en la orden de trabajo
      await tx.workOrder.update({
        where: { id: wo.id },
        data: { billingStatus: BillingStatus.FACTURADA },
      });

      // 5. Registrar en bitácora de auditoría
      await this.audit.log(
        {
          workshopId: actor.workshopId,
          entityType: 'Invoice',
          entityId: createdInvoice.id,
          action: 'INVOICE_ISSUED',
          actorId: actor.id,
          after: {
            invoiceNumber,
            workOrderId: wo.id,
            total,
            uuid: simulatedUuid,
          },
        },
        tx,
      );

      return this.toDto(createdInvoice as InvoiceWithRelations);
    });
  }

  /**
   * Obtiene el listado histórico de facturas emitidas o canceladas.
   */
  async findAllInvoices(
    query: InvoicesQueryDto,
    actor: RequestUser,
  ): Promise<{
    data: InvoiceDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      workshopId: actor.workshopId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { receiverRfc: { contains: s, mode: 'insensitive' } },
        { receiverName: { contains: s, mode: 'insensitive' } },
        { workOrder: { code: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.issuedAt = {};
      if (query.startDate) {
        where.issuedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.issuedAt.lte = end;
      }
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          items: true,
          workOrder: { select: { code: true } },
          issuedBy: { select: { firstName: true, lastName: true } },
          cancelledBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.toDto(inv as InvoiceWithRelations)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Obtiene los detalles de una factura individual.
   */
  async findOneInvoice(
    invoiceId: string,
    actor: RequestUser,
  ): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, workshopId: actor.workshopId },
      include: {
        items: true,
        workOrder: { select: { code: true } },
        issuedBy: { select: { firstName: true, lastName: true } },
        cancelledBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Factura con id '${invoiceId}' no encontrada.`,
      );
    }

    return this.toDto(invoice as InvoiceWithRelations);
  }

  /**
   * Cancela una factura emitida y revierte el estatus fiscal de la orden a CANCELADA.
   */
  async cancelInvoice(
    invoiceId: string,
    dto: CancelInvoiceDto,
    actor: RequestUser,
  ): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, workshopId: actor.workshopId },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Factura con id '${invoiceId}' no encontrada.`,
      );
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('La factura ya se encuentra cancelada.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar estatus de factura a CANCELLED
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancellationReason: dto.cancellationReason.trim(),
          cancelledAt: new Date(),
          cancelledById: actor.id,
        },
        include: {
          items: true,
          workOrder: { select: { code: true } },
          issuedBy: { select: { firstName: true, lastName: true } },
          cancelledBy: { select: { firstName: true, lastName: true } },
        },
      });

      // 2. Actualizar estatus de facturación de la orden de trabajo a CANCELADA
      await tx.workOrder.update({
        where: { id: invoice.workOrderId },
        data: { billingStatus: BillingStatus.CANCELADA },
      });

      // 3. Auditoría
      await this.audit.log(
        {
          workshopId: actor.workshopId,
          entityType: 'Invoice',
          entityId: invoice.id,
          action: 'INVOICE_CANCELLED',
          actorId: actor.id,
          before: { status: InvoiceStatus.ISSUED },
          after: {
            status: InvoiceStatus.CANCELLED,
            cancellationReason: dto.cancellationReason.trim(),
            satReasonCode: dto.satReasonCode,
          },
        },
        tx,
      );

      return this.toDto(updatedInvoice as InvoiceWithRelations);
    });
  }

  private toDto(invoice: InvoiceWithRelations): InvoiceDto {
    return {
      id: invoice.id,
      workshopId: invoice.workshopId,
      workOrderId: invoice.workOrderId,
      workOrderCode: invoice.workOrder?.code,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      receiverRfc: invoice.receiverRfc,
      receiverName: invoice.receiverName,
      receiverZipCode: invoice.receiverZipCode,
      receiverTaxRegime: invoice.receiverTaxRegime,
      cfdiUse: invoice.cfdiUse,
      paymentMethodSat: invoice.paymentMethodSat,
      subtotal: Number(invoice.subtotal),
      discountAmount: Number(invoice.discountAmount),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      uuid: invoice.uuid,
      notes: invoice.notes,
      cancellationReason: invoice.cancellationReason,
      cancelledAt: invoice.cancelledAt,
      issuedById: invoice.issuedById,
      issuedByName: invoice.issuedBy
        ? `${invoice.issuedBy.firstName} ${invoice.issuedBy.lastName}`.trim()
        : undefined,
      cancelledByName: invoice.cancelledBy
        ? `${invoice.cancelledBy.firstName} ${invoice.cancelledBy.lastName}`.trim()
        : undefined,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
      items: invoice.items.map((i) => ({
        id: i.id,
        concept: i.concept,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
        taxAmount: Number(i.taxAmount),
        total: Number(i.total),
        satProductCode: i.satProductCode,
        satUnitCode: i.satUnitCode,
      })),
    };
  }
}
