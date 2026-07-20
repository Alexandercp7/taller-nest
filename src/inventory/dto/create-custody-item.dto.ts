import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustodyItemDto {
  @ApiProperty()
  @IsString()
  clientId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiProperty({ minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @ApiPropertyOptional({
    description:
      'Código de OT, texto libre por ahora (work-orders todavía no existe).',
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  workOrderCode?: string;

  @ApiProperty({ description: 'Empleado del taller responsable de la pieza.' })
  @IsString()
  responsibleUserId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
