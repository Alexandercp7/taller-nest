import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { VehicleType } from '@prisma/client';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { ServiceDto } from './dto/service.dto';
import { SetServicePricesDto } from './dto/set-service-prices.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermission('service:write')
  @ApiOperation({ summary: 'Crear servicio / mano de obra' })
  create(
    @Body() dto: CreateServiceDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ServiceDto> {
    return this.servicesService.create(dto, actor);
  }

  @Get()
  @RequirePermission('service:read')
  @ApiOperation({
    summary:
      'Listar servicios con filtros (categoría, sistema, búsqueda, vehicleType para resolver precio)',
  })
  findAll(
    @Query() query: ListServicesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: ServiceDto[]; total: number }> {
    return this.servicesService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('service:read')
  @ApiOperation({ summary: 'Obtener detalle de un servicio' })
  findOne(
    @Param('id') id: string,
    @Query('vehicleType') vehicleType: VehicleType | undefined,
    @CurrentUser() actor: RequestUser,
  ): Promise<ServiceDto> {
    return this.servicesService.findOne(id, actor, vehicleType);
  }

  @Patch(':id')
  @RequirePermission('service:write')
  @ApiOperation({ summary: 'Actualizar servicio' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ServiceDto> {
    return this.servicesService.update(id, dto, actor);
  }

  @Put(':id/prices')
  @RequirePermission('service:write')
  @ApiOperation({
    summary: 'Establecer matriz de precios por tipo de vehículo para un servicio',
  })
  setPrices(
    @Param('id') id: string,
    @Body() dto: SetServicePricesDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ServiceDto> {
    return this.servicesService.setPrices(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('service:write')
  @ApiOperation({ summary: 'Desactivar servicio (soft-delete)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    return this.servicesService.remove(id, actor);
  }
}
