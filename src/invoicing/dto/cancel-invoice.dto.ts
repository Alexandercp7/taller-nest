import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CancelInvoiceDto {
  @ApiProperty({
    description: 'Motivo de la cancelación interna de la factura',
    example: 'Error en RFC solicitado por el cliente',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'El motivo de cancelación debe tener al menos 5 caracteres' })
  cancellationReason!: string;

  @ApiPropertyOptional({
    description: 'Clave motivo cancelación SAT (01: Comprobante emitido con errores con relación, 02: con errores sin relación, 03: No se llevó a cabo la operación, 04: Operación nominativa relacionada en una factura global)',
    example: '02',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  satReasonCode?: string;
}
