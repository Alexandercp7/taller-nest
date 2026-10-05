import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateReceptionChecklistDto } from './create-reception-checklist.dto';

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({ description: 'ID del vehículo (debe pertenecer al cliente)' })
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @ApiPropertyOptional({
    description: 'ID del asesor de servicio (opcional, defaults al usuario autenticado)',
  })
  @IsString()
  @IsOptional()
  serviceAdvisorId?: string;

  @ApiPropertyOptional({ example: 45000, description: 'Kilometraje de entrada' })
  @IsInt()
  @Min(0)
  @IsOptional()
  mileageIn?: number;

  @ApiPropertyOptional({ example: 50, description: 'Nivel de combustible de 0 a 100%' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  fuelLevel?: number;

  @ApiProperty({
    example: 'Ruidos metálicos al frenar y vibración en volante a más de 80 km/h',
    description: 'Descripción del motivo de ingreso / falla reportada por el cliente',
  })
  @IsString()
  @IsNotEmpty()
  failureDescription!: string;

  @ApiPropertyOptional({
    example: '2026-10-15T18:00:00.000Z',
    description: 'Fecha y hora estimada de entrega pactada',
  })
  @IsDateString()
  @IsOptional()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ type: () => CreateReceptionChecklistDto })
  @ValidateNested()
  @Type(() => CreateReceptionChecklistDto)
  @IsOptional()
  checklist?: CreateReceptionChecklistDto;
}
