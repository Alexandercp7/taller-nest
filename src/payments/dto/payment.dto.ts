import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from '@prisma/client';

export class PaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiPropertyOptional()
  accountReceivableId?: string | null;

  @ApiProperty({ enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  terminalCommission!: string;

  @ApiProperty()
  netAmount!: string;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  receivedById!: string;

  @ApiPropertyOptional()
  receivedByName?: string;

  @ApiPropertyOptional()
  cashMovementId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
