import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { VehicleDto } from './dto/vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicle-query.dto';
import { VinDecodeResult } from './vin-decoder/vin-decoder';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermission('vehicle:write')
  @ApiOperation({ summary: 'create a new vehicle' })
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<VehicleDto> {
    return this.vehiclesService.create(dto, actor);
  }

  @Get()
  @RequirePermission('vehicle:read')
  @ApiOperation({ summary: 'get all vehicles' })
  findAll(
    @Query() query: ListVehiclesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: VehicleDto[]; total: number }> {
    return this.vehiclesService.findAll(query, actor);
  }

  @Get('vin-lookup/:vin')
  @RequirePermission('vehicle:write')
  @ApiOperation({ summary: 'get autocomplete vehicle data from vin' })
  lookupVin(@Param('vin') vin: string): Promise<VinDecodeResult> {
    return this.vehiclesService.lookupVin(vin);
  }

  @Get(':id')
  @RequirePermission('vehicle:read')
  @ApiOperation({ summary: 'get a vehicle by id' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<VehicleDto> {
    return this.vehiclesService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('vehicle:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<VehicleDto> {
    return this.vehiclesService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('vehicle:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'softdelete a vehicle by id' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.vehiclesService.deactivate(id, actor);
  }
}
