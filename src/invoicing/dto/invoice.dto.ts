import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { InvoiceItemDto } from './invoice-item.dto';

export class InvoiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty({ nullable: true })
  workOrderCode?: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  receiverRfc!: string;

  @ApiProperty()
  receiverName!: string;

  @ApiProperty()
  receiverZipCode!: string;

  @ApiProperty()
  receiverTaxRegime!: string;

  @ApiProperty()
  cfdiUse!: string;

  @ApiProperty()
  paymentMethodSat!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ nullable: true })
  uuid?: string | null;

  @ApiProperty({ nullable: true })
  notes?: string | null;

  @ApiProperty({ nullable: true })
  cancellationReason?: string | null;

  @ApiProperty({ nullable: true })
  cancelledAt?: Date | null;

  @ApiProperty()
  issuedById!: string;

  @ApiProperty({ nullable: true })
  issuedByName?: string;

  @ApiProperty({ nullable: true })
  cancelledByName?: string;

  @ApiProperty()
  issuedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [InvoiceItemDto] })
  items!: InvoiceItemDto[];
}
