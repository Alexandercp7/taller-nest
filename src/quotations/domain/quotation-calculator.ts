import { DiscountType, Prisma, QuotationApprovalStatus } from '@prisma/client';

export interface QuotationLineItem {
  quantity: number;
  finalPrice: string | number | Prisma.Decimal;
  approvalStatus?: QuotationApprovalStatus;
}

export interface QuotationCalculationInput {
  lines: QuotationLineItem[];
  discountType?: DiscountType | null;
  discountValue?: string | number | Prisma.Decimal | null;
  aplicaIva?: boolean;
}

export interface QuotationCalculationResult {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxBase: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Cálculo financiero puro de cotización (Decimal(12,2)).
 * Reglas de negocio:
 * - Subtotal = suma(cantidad * precioFinal).
 * - Descuento (PERCENT o FIXED) aplicado sobre subtotal antes de IVA.
 * - Base imponible = subtotal - descuento.
 * - IVA (16%) = aplicaIva ? base * 0.16 : 0.00.
 * - Total = base + IVA.
 */
export function calculateQuotation(
  input: QuotationCalculationInput,
): QuotationCalculationResult {
  let subtotal = new Prisma.Decimal(0);

  for (const line of input.lines) {
    const qty = new Prisma.Decimal(line.quantity || 1);
    const price = new Prisma.Decimal(line.finalPrice.toString());
    subtotal = subtotal.plus(qty.times(price));
  }

  let discountAmount = new Prisma.Decimal(0);
  if (input.discountType && input.discountValue) {
    const rawVal = new Prisma.Decimal(input.discountValue.toString());
    if (input.discountType === DiscountType.PERCENT) {
      discountAmount = subtotal.times(rawVal).dividedBy(100);
    } else {
      discountAmount = Prisma.Decimal.min(rawVal, subtotal);
    }
  }

  const taxBase = Prisma.Decimal.max(0, subtotal.minus(discountAmount));
  const taxAmount = (input.aplicaIva ?? true)
    ? taxBase.times(0.16)
    : new Prisma.Decimal(0);

  const total = taxBase.plus(taxAmount);

  return {
    subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
    discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
    taxBase: new Prisma.Decimal(taxBase.toFixed(2)),
    taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
    total: new Prisma.Decimal(total.toFixed(2)),
  };
}

export function resolveClientApprovalStatus(
  lines: Array<{ approvalStatus: QuotationApprovalStatus }>,
): QuotationApprovalStatus {
  if (lines.length === 0) return QuotationApprovalStatus.PENDING;

  const allApproved = lines.every(
    (l) => l.approvalStatus === QuotationApprovalStatus.APPROVED,
  );
  if (allApproved) return QuotationApprovalStatus.APPROVED;

  const allRejected = lines.every(
    (l) => l.approvalStatus === QuotationApprovalStatus.REJECTED,
  );
  if (allRejected) return QuotationApprovalStatus.REJECTED;

  const anyApproved = lines.some(
    (l) => l.approvalStatus === QuotationApprovalStatus.APPROVED,
  );
  if (anyApproved) return QuotationApprovalStatus.APPROVED;

  return QuotationApprovalStatus.PENDING;
}
