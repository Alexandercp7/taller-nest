import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperationalStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ChangeOperationalStatusDto {
  @ApiProperty({ enum: OperationalStatus })
  @IsEnum(OperationalStatus)
  status!: OperationalStatus;

  @ApiPropertyOptional({
    description: 'Motivo de cancelación (obligatorio si el nuevo estado es CANCELADA)',
  })
  @ValidateIf((o: ChangeOperationalStatusDto) => o.status === OperationalStatus.CANCELADA)
  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio al cancelar una orden de trabajo.' })
  @IsOptional()
  cancelReason?: string;
}
