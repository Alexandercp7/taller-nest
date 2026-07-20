import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsMoneyString } from '@common/validators/is-money-string.decorator';

export class CreateSpecialOrderPartDto {
  @ApiProperty({ minLength: 1, maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  sku!: string;

  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Precio unitario, string decimal con hasta 2 decimales.',
    example: '450.00',
  })
  @IsMoneyString()
  unitPrice!: string;
}
