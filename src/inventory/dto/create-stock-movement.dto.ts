import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty()
  @IsString()
  articleId!: string;

  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @ApiProperty({
    description:
      'ENTRY/EXIT: cantidad a mover. ADJUSTMENT: nuevo stock absoluto tras un conteo físico.',
  })
  @IsInt()
  @Min(0)
  qty!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}
