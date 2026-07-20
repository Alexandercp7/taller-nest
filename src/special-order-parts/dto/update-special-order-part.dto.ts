import { PartialType } from '@nestjs/swagger';
import { CreateSpecialOrderPartDto } from './create-special-order-part.dto';

export class UpdateSpecialOrderPartDto extends PartialType(
  CreateSpecialOrderPartDto,
) {}
