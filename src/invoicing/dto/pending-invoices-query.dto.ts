import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PendingInvoicesQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estatus de facturación',
    enum: BillingStatus,
  })
  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @ApiPropertyOptional({
    description: 'Buscar por folio de orden, cliente, placa o RFC',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
