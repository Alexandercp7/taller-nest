import { ArticleType } from '@prisma/client';
import { SalePriceRequiredException } from '@common/exceptions/domain.exceptions';

export function assertSalePriceRules(
  type: ArticleType,
  salePrice: string | undefined,
): void {
  if (type === ArticleType.PARTE_EN_VENTA && salePrice === undefined) {
    throw new SalePriceRequiredException();
  }
}
