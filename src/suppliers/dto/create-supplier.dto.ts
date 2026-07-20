import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ description: 'Teléfono, 10 a 15 dígitos.' })
  @IsString()
  @Matches(/^\+?\d{10,15}$/)
  phone!: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;
}
