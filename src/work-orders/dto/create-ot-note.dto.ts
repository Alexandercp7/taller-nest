import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOtNoteDto {
  @ApiProperty({ description: 'Contenido de la nota', example: 'Se detectó fuga en amortiguador delantero' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'Si es true, la nota se muestra al cliente en el portal público',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isClientVisible?: boolean = false;
}
