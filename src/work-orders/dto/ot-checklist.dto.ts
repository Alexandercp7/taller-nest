import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OtChecklistDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  hasKeys!: boolean;

  @ApiProperty()
  hasSpareTire!: boolean;

  @ApiProperty()
  hasJack!: boolean;

  @ApiProperty()
  hasTools!: boolean;

  @ApiProperty()
  hasExtinguisher!: boolean;

  @ApiPropertyOptional()
  exteriorDamage?: unknown;

  @ApiPropertyOptional()
  personalItems?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;
}
