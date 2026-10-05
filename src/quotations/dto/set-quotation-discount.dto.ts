import { ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class SetQuotationDiscountDto {
  @ApiPropertyOptional({ enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @ApiPropertyOptional({
    description: 'Valor del descuento (% o monto fijo según discountType)',
    example: '10.00',
  })
  @IsMoneyString()
  @IsOptional()
  discountValue?: string;

  @ApiPropertyOptional({
    description: 'Define si se calcula el IVA (16%) sobre el monto de la orden',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  aplicaIva?: boolean;
}
