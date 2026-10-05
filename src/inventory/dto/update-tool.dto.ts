import { ApiPropertyOptional } from '@nestjs/swagger';
import { ToolCondition, ToolStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class UpdateToolDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ToolCondition })
  @IsEnum(ToolCondition)
  @IsOptional()
  condition?: ToolCondition;

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsEnum(ToolStatus)
  @IsOptional()
  status?: ToolStatus;

  @ApiPropertyOptional({
    description: 'Precio de adquisición/compra del equipo.',
    example: '3500.00',
  })
  @IsMoneyString()
  @IsOptional()
  purchasePrice?: string;

  @ApiPropertyOptional({ description: 'ID del técnico asignado.' })
  @IsString()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Fecha del último mantenimiento o calibración (ISO).' })
  @IsDateString()
  @IsOptional()
  lastMaintenanceAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
