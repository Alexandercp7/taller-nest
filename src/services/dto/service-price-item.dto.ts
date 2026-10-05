import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class ServicePriceItemDto {
  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ example: '450.00', description: 'Precio decimal para este tipo de vehículo' })
  @IsMoneyString()
  price!: string;
}
