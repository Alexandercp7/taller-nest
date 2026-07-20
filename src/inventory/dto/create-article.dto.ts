import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleCondition, ArticleType } from '@prisma/client';
import {
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

  @ApiProperty({ enum: ArticleCondition })
  @IsEnum(ArticleCondition)
  condition!: ArticleCondition;

  @ApiProperty({
    description: 'Precio de compra, string decimal con hasta 2 decimales.',
    example: '450.00',
  })
  @IsMoneyString()
  purchasePrice!: string;

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
