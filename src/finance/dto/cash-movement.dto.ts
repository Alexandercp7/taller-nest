import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementType, CashReferenceType } from '@prisma/client';

export class CashMovementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty({ enum: CashMovementType })
  type!: CashMovementType;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: CashReferenceType })
  referenceType!: CashReferenceType;

  @ApiPropertyOptional()
  referenceId?: string | null;

  @ApiProperty()
  concept!: string;

  @ApiProperty()
  performedById!: string;

  @ApiPropertyOptional()
  performedByName?: string;

  @ApiProperty()
  createdAt!: string;
}
