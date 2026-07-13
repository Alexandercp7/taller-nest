import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  plate!: string;

  @ApiPropertyOptional()
  vin?: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;

  @ApiPropertyOptional()
  km?: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
