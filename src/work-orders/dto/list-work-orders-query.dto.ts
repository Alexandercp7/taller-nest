import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommercialStatus, OperationalStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWorkOrdersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OperationalStatus })
  @IsEnum(OperationalStatus)
  @IsOptional()
  operationalStatus?: OperationalStatus;

  @ApiPropertyOptional({ enum: CommercialStatus })
  @IsEnum(CommercialStatus)
  @IsOptional()
  commercialStatus?: CommercialStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceAdvisorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  estaRetrasada?: boolean;

  @ApiPropertyOptional({ description: 'Búsqueda por folio (OT-0001), cliente o placas' })
  @IsString()
  @IsOptional()
  search?: string;
}
