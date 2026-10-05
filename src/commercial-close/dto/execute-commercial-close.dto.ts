import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ExecuteCommercialCloseDto {
  @ApiProperty({ description: 'Indica si el cliente requiere factura fiscal' })
  @IsBoolean()
  requiresInvoice!: boolean;

  @ApiPropertyOptional({ description: 'Observaciones o notas finales del cierre' })
  @IsOptional()
  @IsString()
  notes?: string;
}
