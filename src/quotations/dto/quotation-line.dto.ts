import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationApprovalStatus, QuotationLineType } from '@prisma/client';

export class QuotationLineDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  quotationId!: string;

  @ApiProperty({ enum: QuotationLineType })
  lineType!: QuotationLineType;

  @ApiPropertyOptional()
  serviceId?: string | null;

  @ApiPropertyOptional()
  articleId?: string | null;

  @ApiProperty({ example: 'Cambio de balatas delanteras' })
  concept!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: '450.00' })
  unitPrice!: string;

  @ApiProperty({ example: '450.00' })
  finalPrice!: string;

  @ApiPropertyOptional()
  priceOverrideReason?: string | null;

  @ApiPropertyOptional()
  priceOverrideById?: string | null;

  @ApiProperty({ enum: QuotationApprovalStatus })
  approvalStatus!: QuotationApprovalStatus;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiPropertyOptional()
  reQuotedFromLineId?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
