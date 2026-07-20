import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialOrderPartDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: 'Decimal como string, p. ej. "450.00".' })
  unitPrice!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
