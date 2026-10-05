import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateToolDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ToolCondition, default: ToolCondition.BUENO })
  @IsEnum(ToolCondition)
  @IsOptional()
  condition?: ToolCondition = ToolCondition.BUENO;

  @ApiPropertyOptional({ enum: ToolStatus, default: ToolStatus.DISPONIBLE })
  @IsEnum(ToolStatus)
  @IsOptional()
  status?: ToolStatus = ToolStatus.DISPONIBLE;

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
