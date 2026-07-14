import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientSegment, PersonType } from '@prisma/client';

export class ClientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty({ enum: PersonType })
  personType!: PersonType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  rfc?: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  hasDebt!: boolean;

  @ApiProperty({ enum: ClientSegment })
  segment!: ClientSegment;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
