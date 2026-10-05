import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ServicePriceItemDto } from './service-price-item.dto';

export class SetServicePricesDto {
  @ApiProperty({
    type: () => [ServicePriceItemDto],
    description: 'Lista completa de precios por tipo de vehículo a establecer para el servicio',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePriceItemDto)
  prices!: ServicePriceItemDto[];
}
