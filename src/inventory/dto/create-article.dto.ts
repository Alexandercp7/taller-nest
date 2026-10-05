import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateArticleDto {
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

  @ApiProperty({ enum: ArticleType })
  @IsEnum(ArticleType)
  type!: ArticleType;

  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ maxLength: 50, description: 'Ubicación en almacén (anaquel/pasillo).' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ default: false, description: 'Indica si es pieza sobre pedido especial.' })
  @IsBoolean()
  @IsOptional()
  isSpecialOrder?: boolean = false;

  @ApiPropertyOptional({
    description: 'Precio de compra/costo, string decimal con hasta 2 decimales.',
    example: '450.00',
  })
  @IsMoneyString()
  @IsOptional()
  purchasePrice?: string;

  @ApiPropertyOptional({
    description:
      'Precio de venta, string decimal con hasta 2 decimales. Solo aplica a CONSUMIBLE y PARTE_EN_VENTA.',
    example: '650.00',
  })
  @IsMoneyString()
  @IsOptional()
  salePrice?: string;

  @ApiPropertyOptional({ default: 0, description: 'Stock inicial.' })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minStock?: number = 0;
}
