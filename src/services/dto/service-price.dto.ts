import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';

export class ServicePriceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty({ enum: VehicleType })
  vehicleType!: VehicleType;

  @ApiProperty({ example: '450.00' })
  price!: string;
}
