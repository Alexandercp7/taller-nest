import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { UploadsModule } from '@common/uploads/uploads.module';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { CustodyService } from './custody.service';
import { CustodyController } from './custody.controller';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';

@Module({
  imports: [AuditModule, ClientsModule, UploadsModule],
  controllers: [InventoryController, CustodyController, ToolsController],
  providers: [InventoryService, CustodyService, ToolsService],
  exports: [InventoryService, CustodyService, ToolsService],
})
export class InventoryModule {}
