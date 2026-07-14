import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../clients/clients.module';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { VIN_DECODER } from './vin-decoder/vin-decoder';
import { NhtsaVinDecoder } from './vin-decoder/nhtsa-vin-decoder.service';

@Module({
  imports: [AuditModule, ClientsModule],
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    { provide: VIN_DECODER, useClass: NhtsaVinDecoder },
  ],
})
export class VehiclesModule {}
