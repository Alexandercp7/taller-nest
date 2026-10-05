import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateWorkOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  failureDescription?: string;

  @ApiPropertyOptional({ description: 'Diagnóstico técnico del mecánico' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceAdvisorId?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  mileageIn?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  fuelLevel?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  estimatedDelivery?: string;
}
