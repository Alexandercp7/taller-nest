import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommercialStatus, ReceivableStatus } from '@prisma/client';
import { PaymentDto } from './payment.dto';

export class PaymentSummaryDto {
  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  workOrderCode!: string;

  @ApiProperty({ enum: CommercialStatus })
  commercialStatus!: CommercialStatus;

  @ApiProperty({ description: 'Total estimado en la cotización' })
  quotationTotal!: string;

  @ApiPropertyOptional({ description: 'Total definitivo congelado al cierre comercial' })
  frozenTotal?: string | null;

  @ApiProperty({ description: 'Suma de todos los pagos registrados' })
  totalPaid!: string;

  @ApiProperty({ description: 'Saldo deudor remanente' })
  balance!: string;

  @ApiPropertyOptional({ enum: ReceivableStatus })
  receivableStatus?: ReceivableStatus | null;

  @ApiProperty({ type: [PaymentDto] })
  payments!: PaymentDto[];
}
