import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class EmitInvoiceDto {
  @ApiPropertyOptional({
    description: 'Método de pago SAT (PUE = Pago en una sola exhibición, PPD = Pago en parcialidades o diferido)',
    example: 'PUE',
    default: 'PUE',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  paymentMethodSat?: string = 'PUE';

  @ApiPropertyOptional({
    description: 'Forma de pago SAT (01: Efectivo, 03: Transferencia, 04: Tarjeta crédito, 28: Tarjeta débito, 99: Por definir)',
    example: '03',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  paymentFormSat?: string;

  @ApiPropertyOptional({
    description: 'Notas u observaciones fiscales internas',
    example: 'Factura correspondiente a servicio de frenos y afinación mayor',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
