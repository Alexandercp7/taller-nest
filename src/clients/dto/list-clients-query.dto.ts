import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientSegment } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const SORTABLE_FIELDS = [
  'name:asc',
  'name:desc',
  'createdAt:asc',
  'createdAt:desc',
  'hasDebt:asc',
  'hasDebt:desc',
] as const;

export class ListClientsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  includeInactive?: boolean = false;

  @ApiPropertyOptional({ enum: ClientSegment })
  @IsEnum(ClientSegment)
  @IsOptional()
  segment?: ClientSegment;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  hasDebt?: boolean;

  @ApiPropertyOptional({ description: 'Busca por name o phone (contains).' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'createdAt:desc' })
  @IsIn(SORTABLE_FIELDS)
  @IsOptional()
  sort?: (typeof SORTABLE_FIELDS)[number] = 'createdAt:desc';
}
