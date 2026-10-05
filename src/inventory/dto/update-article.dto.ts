import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

/**
 * No incluye `stock` (solo cambia vía POST /inventory/movements para conservar
 * el kardex como fuente de verdad) ni `photoUrl` (se gestiona vía
 * POST /inventory/articles/:id/photo).
 */
export class UpdateArticleDto {
  @ApiPropertyOptional({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  oemNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ArticleType })
  @IsEnum(ArticleType)
  @IsOptional()
  type?: ArticleType;

  @ApiPropertyOptional({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSpecialOrder?: boolean;

  @ApiPropertyOptional({
    description: 'Precio de compra, string decimal con hasta 2 decimales.',
  })
  @IsMoneyString()
  @IsOptional()
  purchasePrice?: string;

  @ApiPropertyOptional({
    description: 'Precio de venta, string decimal con hasta 2 decimales.',
  })
  @IsMoneyString()
  @IsOptional()
  salePrice?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  minStock?: number;
}
