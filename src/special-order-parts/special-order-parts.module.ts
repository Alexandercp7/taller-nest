import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SpecialOrderPartsController } from './special-order-parts.controller';
import { SpecialOrderPartsService } from './special-order-parts.service';

@Module({
  imports: [AuditModule],
  controllers: [SpecialOrderPartsController],
  providers: [SpecialOrderPartsService],
  exports: [SpecialOrderPartsService],
})
export class SpecialOrderPartsModule {}
