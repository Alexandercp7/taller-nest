import { ApiProperty } from '@nestjs/swagger';
import { BillingStatus } from '@prisma/client';

export class FiscalValidationSummaryDto {
  @ApiProperty()
  isValid!: boolean;

  @ApiProperty({ type: [String] })
  missingFields!: string[];

  @ApiProperty({ type: [String] })
  errors!: string[];
}

export class PendingInvoiceClientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ nullable: true })
  email?: string | null;

  @ApiProperty({ nullable: true })
  rfc?: string | null;

  @ApiProperty({ nullable: true })
  businessName?: string | null;

  @ApiProperty({ nullable: true })
  zipCode?: string | null;

  @ApiProperty({ nullable: true })
  taxRegime?: string | null;

  @ApiProperty({ nullable: true })
  cfdiUse?: string | null;
}

export class PendingInvoiceVehicleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  plate!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;
}

export class PendingInvoiceItemDto {
  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: BillingStatus })
  billingStatus!: BillingStatus;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ nullable: true })
  closedAt?: Date | null;

  @ApiProperty({ type: PendingInvoiceClientDto })
  client!: PendingInvoiceClientDto;

  @ApiProperty({ type: PendingInvoiceVehicleDto })
  vehicle!: PendingInvoiceVehicleDto;

  @ApiProperty({ type: FiscalValidationSummaryDto })
  fiscalValidation!: FiscalValidationSummaryDto;
}
