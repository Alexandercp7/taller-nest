import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

export class StockMovementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  articleId!: string;

  @ApiPropertyOptional()
  workOrderId?: string;

  @ApiProperty({ enum: StockMovementType })
  type!: StockMovementType;

  @ApiProperty()
  qty!: number;

  @ApiProperty()
  before!: number;

  @ApiProperty()
  after!: number;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Costo unitario registrado en el movimiento.' })
  unitCost?: string;

  @ApiProperty()
  actorId!: string;

  @ApiProperty()
  createdAt!: Date;
}
