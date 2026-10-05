import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType } from '@prisma/client';

export class ArticleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiPropertyOptional()
  sku?: string;

  @ApiPropertyOptional()
  oemNumber?: string;

  @ApiPropertyOptional()
  supplierId?: string;

  @ApiProperty({ enum: ArticleType })
  type!: ArticleType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  isSpecialOrder!: boolean;

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
