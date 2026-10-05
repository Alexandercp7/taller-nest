import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class UpdateQuotationLineDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  concept?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: '450.00' })
  @IsMoneyString()
  @IsOptional()
  unitPrice?: string;

  @ApiPropertyOptional({ example: '450.00' })
  @IsMoneyString()
  @IsOptional()
  finalPrice?: string;
}
