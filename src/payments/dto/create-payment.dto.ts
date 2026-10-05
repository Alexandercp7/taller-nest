import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType, default: PaymentType.FINAL_SETTLEMENT })
  @IsEnum(PaymentType)
  type!: PaymentType;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: '450.00', description: 'Monto con hasta 2 decimales' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount debe ser un número decimal válido con hasta 2 decimales.',
  })
  amount!: string;

  @ApiPropertyOptional({
    example: '15.00',
    description: 'Comisión de terminal bancaria (solo aplicable a pago CARD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'terminalCommission debe ser un número decimal válido con hasta 2 decimales.',
  })
  terminalCommission?: string;

  @ApiPropertyOptional({ example: 'AUT-837192', description: 'Número de autorización o folio bancario' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Pago en recepción terminal Banamex' })
  @IsOptional()
  @IsString()
  notes?: string;
}
