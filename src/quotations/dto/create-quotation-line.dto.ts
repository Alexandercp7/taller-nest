import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationLineType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class CreateQuotationLineDto {
  @ApiProperty({ enum: QuotationLineType })
  @IsEnum(QuotationLineType)
  lineType!: QuotationLineType;

  @ApiPropertyOptional({ description: 'ID del servicio (si lineType es SERVICE)' })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'ID de la refacción (si lineType es PART)' })
  @IsString()
  @IsOptional()
  articleId?: string;

  @ApiPropertyOptional({
    description: 'Concepto descriptivo (si se omite, se toma del servicio o refacción)',
    example: 'Cambio de balatas delanteras',
  })
  @IsString()
  @IsOptional()
  concept?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({
    example: '450.00',
    description: 'Precio unitario (si se omite, se resuelve automáticamente del catálogo)',
  })
  @IsMoneyString()
  @IsOptional()
  unitPrice?: string;

  @ApiPropertyOptional({
    example: '450.00',
    description: 'Precio final pactado (defaults a unitPrice)',
  })
  @IsMoneyString()
  @IsOptional()
  finalPrice?: string;

  @ApiPropertyOptional({
    description: 'ID de la línea original si se trata de una recotización',
  })
  @IsString()
  @IsOptional()
  reQuotedFromLineId?: string;
}
