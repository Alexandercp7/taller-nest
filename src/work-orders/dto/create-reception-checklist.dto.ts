import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateReceptionChecklistDto {
  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  hasKeys?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasSpareTire?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasJack?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasTools?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hasExtinguisher?: boolean = false;

  @ApiPropertyOptional({
    description: 'Inventario o diagrama de daños exteriores (JSON)',
    example: [{ component: 'parachoques_delantero', damageType: 'rayon' }],
  })
  @IsOptional()
  exteriorDamage?: unknown;

  @ApiPropertyOptional({ description: 'Objetos personales dejados en cabina' })
  @IsString()
  @IsOptional()
  personalItems?: string;

  @ApiPropertyOptional({ description: 'Notas de recepción' })
  @IsString()
  @IsOptional()
  notes?: string;
}
