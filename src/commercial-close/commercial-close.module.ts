import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { FinanceModule } from '../finance/finance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialCloseController } from './commercial-close.controller';
import { CommercialCloseService } from './commercial-close.service';

@Module({
  imports: [PrismaModule, AuditModule, FinanceModule, ClientsModule],
  controllers: [CommercialCloseController],
  providers: [CommercialCloseService],
  exports: [CommercialCloseService],
})
export class CommercialCloseModule {}
