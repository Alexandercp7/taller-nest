import { StockMovementType } from '@prisma/client';
import {
  InsufficientStockException,
  InvalidQuantityException,
} from '@common/exceptions/domain.exceptions';

export function assertPositiveQuantity(qty: number): void {
  if (qty <= 0) throw new InvalidQuantityException();
}

export function assertSufficientStock(available: number, qty: number): void {
  if (qty > available) throw new InsufficientStockException();
}

/**
 * ENTRY/EXIT son deltas sobre el stock actual; ADJUSTMENT fija el stock al
 * valor observado en un conteo físico (qty es el nuevo stock absoluto).
 */
export function computeNextStock(
  before: number,
  qty: number,
  type: StockMovementType,
): number {
  switch (type) {
    case StockMovementType.ENTRY:
      assertPositiveQuantity(qty);
      return before + qty;
    case StockMovementType.EXIT:
      assertPositiveQuantity(qty);
      assertSufficientStock(before, qty);
      return before - qty;
    case StockMovementType.ADJUSTMENT:
      return qty;
  }
}
