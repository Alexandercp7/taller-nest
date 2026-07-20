import { ArticleType } from '@prisma/client';
import {
  SalePriceNotAllowedException,
  SalePriceRequiredException,
} from '@common/exceptions/domain.exceptions';

export const ARTICLE_TYPES_WITH_SALE_PRICE: ArticleType[] = [
  ArticleType.CONSUMIBLE,
  ArticleType.PARTE_EN_VENTA,
];

export function assertSalePriceRules(
  type: ArticleType,
  salePrice: string | undefined,
): void {
  const requiresSalePrice = ARTICLE_TYPES_WITH_SALE_PRICE.includes(type);
  if (requiresSalePrice && salePrice === undefined)
    throw new SalePriceRequiredException();
  if (!requiresSalePrice && salePrice !== undefined)
    throw new SalePriceNotAllowedException();
}
