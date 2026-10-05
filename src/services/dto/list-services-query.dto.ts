import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCategory, VehicleType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListServicesQueryDto {
  @ApiPropertyOptional({ description: 'Página (1-based)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Tamaño de página', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Búsqueda por concepto o código' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ServiceCategory })
  @IsEnum(ServiceCategory)
  @IsOptional()
  category?: ServiceCategory;

  @ApiPropertyOptional({ description: 'Filtrar por sistema (ej. Frenos, Motor)' })
  @IsString()
  @IsOptional()
  system?: string;

  @ApiPropertyOptional({ enum: VehicleType, description: 'Tipo de vehículo para resolver precio' })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Incluir servicios inactivos', default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean = false;
}
