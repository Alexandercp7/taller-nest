import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoCategory } from '@prisma/client';

export class OtPhotoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: PhotoCategory })
  category!: PhotoCategory;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  caption?: string | null;

  @ApiProperty()
  isPublic!: boolean;

  @ApiProperty()
  createdAt!: string;
}
