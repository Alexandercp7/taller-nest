import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReceivableStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListReceivablesQueryDto {
  @ApiPropertyOptional({ enum: ReceivableStatus })
  @IsOptional()
  @IsEnum(ReceivableStatus)
  status?: ReceivableStatus;

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
