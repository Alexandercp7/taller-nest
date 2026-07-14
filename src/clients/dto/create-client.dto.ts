import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ enum: PersonType })
  @IsEnum(PersonType)
  personType!: PersonType;

  @ApiProperty({ minLength: 2, maxLength: 150 })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: 'RFC; longitud exacta se valida según personType.',
  })
  @IsString()
  @Length(10, 13)
  @IsOptional()
  rfc?: string;

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
