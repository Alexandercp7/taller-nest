import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementType, CashReferenceType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @ApiProperty({ example: '150.00', description: 'Monto con hasta 2 decimales' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount debe ser un número decimal válido con hasta 2 decimales.',
  })
  amount!: string;

  @ApiProperty({ example: 'Compra menor de insumos de limpieza para taller' })
  @IsString()
  @IsNotEmpty()
  concept!: string;

  @ApiPropertyOptional({ enum: CashReferenceType, default: CashReferenceType.MANUAL })
  @IsOptional()
  @IsEnum(CashReferenceType)
  referenceType?: CashReferenceType = CashReferenceType.MANUAL;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;
}
