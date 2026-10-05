import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToolCondition, ToolStatus } from '@prisma/client';

export class ToolDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiPropertyOptional()
  serialNumber?: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ToolCondition })
  condition!: ToolCondition;

  @ApiProperty({ enum: ToolStatus })
  status!: ToolStatus;

  @ApiPropertyOptional({ description: 'Precio de compra como string decimal.' })
  purchasePrice?: string;

  @ApiPropertyOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  lastMaintenanceAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
