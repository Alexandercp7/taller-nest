import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus, CommercialStatus } from '@prisma/client';

export class CommercialCloseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty({ description: 'Monto definitivo congelado de la orden' })
  frozenTotal!: string;

  @ApiProperty()
  closedById!: string;

  @ApiPropertyOptional()
  closedByName?: string;

  @ApiProperty()
  closedAt!: string;

  @ApiProperty({ enum: BillingStatus })
  billingStatusResolved!: BillingStatus;

  @ApiProperty({ enum: CommercialStatus })
  commercialStatus!: CommercialStatus;

  @ApiProperty({ description: 'Saldo remanente por pagar en la CxC' })
  balance!: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;
}
