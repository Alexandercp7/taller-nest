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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { SupplierDto } from './dto/supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermission('supplier:write')
  @ApiOperation({ summary: 'Crear proveedor' })
  create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<SupplierDto> {
    return this.suppliersService.create(dto, actor);
  }

  @Get()
  @RequirePermission('supplier:read')
  @ApiOperation({ summary: 'Listar proveedores' })
  findAll(
    @Query() query: ListSuppliersQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: SupplierDto[]; total: number }> {
    return this.suppliersService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('supplier:read')
  @ApiOperation({ summary: 'Obtener un proveedor' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<SupplierDto> {
    return this.suppliersService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('supplier:write')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<SupplierDto> {
    return this.suppliersService.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('supplier:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar proveedor (soft-delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.suppliersService.deactivate(id, actor);
  }
}
