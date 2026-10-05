import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, QuotationApprovalStatus } from '@prisma/client';
import { QuotationLineDto } from './quotation-line.dto';

export class QuotationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty({ example: '1250.00' })
  subtotal!: string;

  @ApiPropertyOptional({ enum: DiscountType })
  discountType?: DiscountType | null;

  @ApiPropertyOptional({ example: '10.00' })
  discountValue?: string | null;

  @ApiProperty({ example: true })
  aplicaIva!: boolean;

  @ApiProperty({ example: '200.00' })
  taxAmount!: string;

  @ApiProperty({ example: '1450.00' })
  total!: string;

  @ApiProperty({ enum: QuotationApprovalStatus })
  clientApprovalStatus!: QuotationApprovalStatus;

  @ApiPropertyOptional()
  approvedAt?: string | null;

  @ApiProperty({ type: () => [QuotationLineDto] })
  lines!: QuotationLineDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
