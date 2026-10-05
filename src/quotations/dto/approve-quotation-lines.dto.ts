import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationApprovalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LineDecisionDto {
  @ApiProperty({ description: 'ID de la línea de cotización' })
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @ApiProperty({ enum: [QuotationApprovalStatus.APPROVED, QuotationApprovalStatus.REJECTED] })
  @IsEnum(QuotationApprovalStatus)
  status!: QuotationApprovalStatus;

  @ApiPropertyOptional({
    description: 'Motivo del rechazo expresado por el cliente (útil para analítica)',
    example: 'Presupuesto elevado / cliente pospone reparación',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ApproveQuotationLinesDto {
  @ApiProperty({ type: () => [LineDecisionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineDecisionDto)
  decisions!: LineDecisionDto[];
}
