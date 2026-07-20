import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

const SORTABLE_FIELDS = [
  'name:asc',
  'name:desc',
  'createdAt:asc',
  'createdAt:desc',
] as const;

export class ListSpecialOrderPartsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por name o sku (contains).' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'createdAt:desc' })
  @IsIn(SORTABLE_FIELDS)
  @IsOptional()
  sort?: (typeof SORTABLE_FIELDS)[number] = 'createdAt:desc';
}
