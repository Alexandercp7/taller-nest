import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceivableStatus } from '@prisma/client';

export class AccountReceivableDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiPropertyOptional()
  workOrderCode?: string;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional()
  clientName?: string;

  @ApiProperty({ description: 'Monto total original congelado al cierre' })
  originalAmount!: string;

  @ApiProperty({ description: 'Monto total pagado/abonado a la fecha' })
  paidAmount!: string;

  @ApiProperty({ description: 'Saldo deudor remanente' })
  balance!: string;

  @ApiProperty({ enum: ReceivableStatus })
  status!: ReceivableStatus;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
