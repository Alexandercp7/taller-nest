import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class OverrideLinePriceDto {
  @ApiProperty({
    example: '380.00',
    description: 'Nuevo precio final ajustado por el asesor o administrador',
  })
  @IsMoneyString()
  finalPrice!: string;

  @ApiProperty({
    example: 'Descuento autorizado por cliente frecuente / fidelidad',
    description: 'Motivo obligatorio del ajuste de precio para auditoría',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del ajuste de precio es obligatorio.' })
  reason!: string;
}
