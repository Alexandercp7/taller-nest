import { ApiProperty } from '@nestjs/swagger';

export class OtNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workOrderId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  isClientVisible!: boolean;

  @ApiProperty()
  createdAt!: string;
}
