import { Inject, Injectable } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaService } from '@prisma-service/prisma.service';
import { AuditService } from '@audit/audit.service';
import { VIN_DECODER, VinDecodeResult, VinDecoder} from './vin-decoder/vin-decoder';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    @Inject(VIN_DECODER) private readonly vinDecoder: VinDecoder,
  ){}
}
