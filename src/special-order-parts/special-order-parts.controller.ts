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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { SpecialOrderPartsService } from './special-order-parts.service';
import { CreateSpecialOrderPartDto } from './dto/create-special-order-part.dto';
import { ListSpecialOrderPartsQueryDto } from './dto/list-special-order-parts-query.dto';
import { SpecialOrderPartDto } from './dto/special-order-part.dto';
import { UpdateSpecialOrderPartDto } from './dto/update-special-order-part.dto';

@ApiTags('special-order-parts')
@Controller('special-order-parts')
export class SpecialOrderPartsController {
  constructor(
    private readonly specialOrderPartsService: SpecialOrderPartsService,
  ) {}

  @Post()
  @RequirePermission('special-order-part:write')
  @ApiOperation({ summary: 'Crear refacción de pedido especial' })
  create(
    @Body() dto: CreateSpecialOrderPartDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<SpecialOrderPartDto> {
    return this.specialOrderPartsService.create(dto, actor);
  }

  @Get()
  @RequirePermission('special-order-part:read')
  @ApiOperation({ summary: 'Listar refacciones de pedido especial' })
  findAll(
    @Query() query: ListSpecialOrderPartsQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: SpecialOrderPartDto[]; total: number }> {
    return this.specialOrderPartsService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('special-order-part:read')
  @ApiOperation({ summary: 'Obtener una refacción de pedido especial' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<SpecialOrderPartDto> {
    return this.specialOrderPartsService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('special-order-part:write')
  @ApiOperation({ summary: 'Actualizar una refacción de pedido especial' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecialOrderPartDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<SpecialOrderPartDto> {
    return this.specialOrderPartsService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('special-order-part:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar refacción (soft-delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.specialOrderPartsService.deactivate(id, actor);
  }
}
