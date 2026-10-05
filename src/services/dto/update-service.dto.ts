import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';
import { ServicePriceItemDto } from './service-price-item.dto';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'SRV-FREN-01', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 150, example: 'Cambio de balatas delanteras' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsOptional()
  concept?: string;

  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @ApiPropertyOptional({ maxLength: 80, example: 'Frenos' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @IsOptional()
  system?: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Disco delantero' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  family?: string;

  @ApiPropertyOptional({ example: 60, description: 'Tiempo estándar de mano de obra en minutos' })
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: '350.00', description: 'Precio fijo universal si aplica' })
  @IsMoneyString()
  @IsOptional()
  basePrice?: string;

  @ApiPropertyOptional({ example: '150.00', description: 'Costo de referencia o maquila' })
  @IsMoneyString()
  @IsOptional()
  costPrice?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: () => [ServicePriceItemDto],
    description: 'Matriz opcional de precios por tipo de vehículo (AUTO, CAMIONETA, CAMION)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePriceItemDto)
  @IsOptional()
  prices?: ServicePriceItemDto[];
}
