import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory } from '@prisma/client';
import { ServicePriceDto } from './service-price.dto';

export class ServiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiPropertyOptional()
  code?: string | null;

  @ApiProperty()
  concept!: string;

  @ApiProperty({ enum: ServiceCategory })
  category!: ServiceCategory;

  @ApiProperty()
  system!: string;

  @ApiPropertyOptional()
  family?: string | null;

  @ApiPropertyOptional({ description: 'Tiempo estándar en minutos' })
  estimatedMinutes?: number | null;

  @ApiPropertyOptional({ example: '350.00' })
  basePrice?: string | null;

  @ApiPropertyOptional({ example: '150.00' })
  costPrice?: string | null;

  @ApiPropertyOptional({
    description:
      'Precio resuelto para un vehicleType específico (precio de ServicePrice o fallback a basePrice)',
    example: '450.00',
  })
  resolvedPrice?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: () => [ServicePriceDto] })
  prices!: ServicePriceDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
