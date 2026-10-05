import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateFiscalDataDto {
  @ApiProperty({ description: 'RFC del receptor (Física, Moral o Genérico)', example: 'PEPJ8001019Q8' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  rfc!: string;

  @ApiProperty({ description: 'Razón Social o Nombre fiscal registrado en el SAT', example: 'JUAN PEREZ PEREZ' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @ApiProperty({ description: 'Código Postal del domicilio fiscal (5 dígitos)', example: '03100' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(5, 5, { message: 'El código postal debe ser de exactamente 5 dígitos' })
  @Matches(/^\d{5}$/, { message: 'El código postal debe contener sólo números' })
  zipCode!: string;

  @ApiProperty({ description: 'Clave SAT del Régimen Fiscal', example: '612' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  taxRegime!: string;

  @ApiPropertyOptional({ description: 'Clave SAT de Uso de CFDI (default: G03)', example: 'G03' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  cfdiUse?: string;

  @ApiPropertyOptional({
    description: 'Actualizar también los datos maestros del cliente para futuras órdenes',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  applyToClient?: boolean = true;
}
