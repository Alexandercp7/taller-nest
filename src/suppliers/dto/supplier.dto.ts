import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  contactName?: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
