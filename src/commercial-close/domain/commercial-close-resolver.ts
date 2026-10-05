import { BadRequestException } from '@nestjs/common';
import {
  BillingStatus,
  CommercialStatus,
  DiscountType,
  OperationalStatus,
  Prisma,
  QuotationApprovalStatus,
  QuotationLineType,
} from '@prisma/client';
import { calculateQuotation } from '../../quotations/domain/quotation-calculator';

export interface QuotationLineInput {
  lineType: QuotationLineType;
  quantity: number;
  finalPrice: Prisma.Decimal;
  approvalStatus: QuotationApprovalStatus;
}

export interface QuotationInput {
  discountType: DiscountType | null;
  discountValue: Prisma.Decimal | null;
  aplicaIva: boolean;
  lines: QuotationLineInput[];
}

export interface CloseWorkOrderInput {
  operationalStatus: OperationalStatus;
  client: {
    rfc: string | null;
  };
  quotation: QuotationInput | null;
}

export interface CommercialCloseResolution {
  frozenTotal: Prisma.Decimal;
  billingStatus: BillingStatus;
  approvedLinesCount: number;
}

const ALLOWED_OPERATIONAL_STATUSES_FOR_CLOSE: readonly OperationalStatus[] = [
  OperationalStatus.CONTROL_CALIDAD,
  OperationalStatus.LISTA_PARA_ENTREGA,
  OperationalStatus.ENTREGADA,
  OperationalStatus.CERRADA,
];

export class CommercialCloseResolver {
  static resolve(
    wo: CloseWorkOrderInput,
    requiresInvoice: boolean,
  ): CommercialCloseResolution {
    if (!ALLOWED_OPERATIONAL_STATUSES_FOR_CLOSE.includes(wo.operationalStatus)) {
      throw new BadRequestException(
        `La orden de trabajo no puede cerrarse comercialmente en estado '${wo.operationalStatus}'. Debe estar en CONTROL_CALIDAD, LISTA_PARA_ENTREGA o ENTREGADA.`,
      );
    }

    // 1. Filtrar solo las líneas APPROVED
    const approvedLines = (wo.quotation?.lines ?? []).filter(
      (l) => l.approvalStatus === QuotationApprovalStatus.APPROVED,
    );

    let frozenTotal = new Prisma.Decimal('0.00');

    if (approvedLines.length > 0 && wo.quotation) {
      const calculation = calculateQuotation({
        discountType: wo.quotation.discountType,
        discountValue: wo.quotation.discountValue,
        aplicaIva: wo.quotation.aplicaIva,
        lines: approvedLines.map((l) => ({
          quantity: l.quantity,
          finalPrice: l.finalPrice,
        })),
      });
      frozenTotal = calculation.total;
    }

    // 2. Resolver BillingStatus
    let billingStatus: BillingStatus = BillingStatus.NO_REQUERIDA;
    if (requiresInvoice) {
      const rfc = wo.client.rfc?.trim().toUpperCase();
      const hasValidRfcFormat = rfc && (rfc.length === 12 || rfc.length === 13) && rfc !== 'XAXX010101000';
      billingStatus = hasValidRfcFormat
        ? BillingStatus.LISTA_PARA_FACTURAR
        : BillingStatus.PENDIENTE_DATOS;
    }

    return {
      frozenTotal,
      billingStatus,
      approvedLinesCount: approvedLines.length,
    };
  }

  static resolveCommercialStatus(
    balance: Prisma.Decimal,
    frozenTotal: Prisma.Decimal,
  ): CommercialStatus {
    if (balance.isZero()) {
      return CommercialStatus.COBRADA_TOTAL;
    }
    if (balance.lt(frozenTotal)) {
      return CommercialStatus.COBRADA_PARCIAL;
    }
    return CommercialStatus.CIERRE_PENDIENTE;
  }
}
