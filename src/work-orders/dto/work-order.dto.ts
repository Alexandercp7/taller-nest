import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus, CommercialStatus, OperationalStatus } from '@prisma/client';
import { OtChecklistDto } from './ot-checklist.dto';
import { OtNoteDto } from './ot-note.dto';
import { OtPhotoDto } from './ot-photo.dto';

export class WorkOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workshopId!: string;

  @ApiProperty({ example: 'OT-0001' })
  code!: string;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional()
  clientName?: string;

  @ApiProperty()
  vehicleId!: string;

  @ApiPropertyOptional()
  vehicleDescription?: string;

  @ApiProperty()
  serviceAdvisorId!: string;

  @ApiPropertyOptional()
  serviceAdvisorName?: string;

  @ApiProperty({ enum: OperationalStatus })
  operationalStatus!: OperationalStatus;

  @ApiProperty({ enum: CommercialStatus })
  commercialStatus!: CommercialStatus;

  @ApiProperty({ enum: BillingStatus })
  billingStatus!: BillingStatus;

  @ApiProperty()
  estaRetrasada!: boolean;

  @ApiProperty({ description: 'Token de acceso seguro al portal público' })
  portalToken!: string;

  @ApiPropertyOptional()
  mileageIn?: number | null;

  @ApiPropertyOptional()
  fuelLevel?: number | null;

  @ApiProperty()
  failureDescription!: string;

  @ApiPropertyOptional()
  diagnosis?: string | null;

  @ApiPropertyOptional()
  estimatedDelivery?: string | null;

  @ApiPropertyOptional()
  deliveredAt?: string | null;

  @ApiPropertyOptional()
  closedAt?: string | null;

  @ApiPropertyOptional()
  cancelledAt?: string | null;

  @ApiPropertyOptional()
  cancelReason?: string | null;

  @ApiPropertyOptional({ type: () => OtChecklistDto })
  checklist?: OtChecklistDto | null;

  @ApiPropertyOptional({ type: () => [OtNoteDto] })
  notes?: OtNoteDto[];

  @ApiPropertyOptional({ type: () => [OtPhotoDto] })
  photos?: OtPhotoDto[];

  @ApiPropertyOptional({ example: '1250.00' })
  quotationTotal?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
