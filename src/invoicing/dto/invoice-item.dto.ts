import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  concept!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ nullable: true })
  satProductCode?: string | null;

  @ApiProperty({ nullable: true })
  satUnitCode?: string | null;
}
