import { ApiPropertyOptional } from '@nestjs/swagger';
import { ToolCondition, ToolStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class ListToolsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ToolCondition })
  @IsEnum(ToolCondition)
  @IsOptional()
  condition?: ToolCondition;

  @ApiPropertyOptional({ enum: ToolStatus })
  @IsEnum(ToolStatus)
  @IsOptional()
  status?: ToolStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, marca o número de serie.' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean = false;
}
