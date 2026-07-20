import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleCondition, ArticleType } from '@prisma/client';

export class ArticleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiPropertyOptional()
  sku?: string;

  @ApiProperty({ enum: ArticleType })
  type!: ArticleType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ArticleCondition })
  condition?: ArticleCondition;

  @ApiPropertyOptional({ description: 'Decimal como string, p. ej. "450.00".' })
  purchasePrice?: string;

  @ApiPropertyOptional({ description: 'Decimal como string, p. ej. "650.00".' })
  salePrice?: string;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiProperty()
  stock!: number;

  @ApiProperty()
  minStock!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
