import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { FinanceModule } from '../finance/finance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, AuditModule, FinanceModule, ClientsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
