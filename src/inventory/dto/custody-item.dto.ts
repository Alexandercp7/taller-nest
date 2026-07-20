import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustodyItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional()
  vehicleId?: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  workOrderCode?: string;

  @ApiPropertyOptional()
  responsibleUserId?: string;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiProperty()
  receivedAt!: Date;

  @ApiPropertyOptional()
  returnedAt?: Date;

  @ApiProperty()
  isReturned!: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt!: Date;
}
