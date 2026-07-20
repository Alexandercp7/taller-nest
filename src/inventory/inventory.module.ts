import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { UploadsModule } from '@common/uploads/uploads.module';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { CustodyService } from './custody.service';
import { CustodyController } from './custody.controller';

@Module({
  imports: [AuditModule, ClientsModule, UploadsModule],
  controllers: [InventoryController, CustodyController],
  providers: [InventoryService, CustodyService],
  exports: [InventoryService, CustodyService],
})
export class InventoryModule {}
