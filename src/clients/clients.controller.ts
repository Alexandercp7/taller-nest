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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { ClientDto } from './dto/client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermission('client:write')
  @ApiOperation({ summary: 'create a new client' })
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ClientDto> {
    return this.clientsService.create(dto, actor);
  }

  @Get()
  @RequirePermission('client:read')
  @ApiOperation({ summary: 'list clients' })
  findAll(
    @Query() query: ListClientsQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: ClientDto[]; total: number }> {
    return this.clientsService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('client:read')
  @ApiOperation({ summary: 'get a client by id' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<ClientDto> {
    return this.clientsService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('client:write')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.clientsService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('client:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar cliente (soft-delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.clientsService.deactivate(id, actor);
  }

  @Post(':id/recalculate-tag')
  @RequirePermission('client:write')
  @ApiOperation({ summary: 'Recalcular etiqueta del cliente' })
  async recalculateTag(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.clientsService.recalculateTag(id, actor.id);
  }
}
