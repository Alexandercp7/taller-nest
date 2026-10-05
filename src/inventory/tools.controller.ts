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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { imageUploadOptions } from '@common/uploads/image-upload.config';
import { CreateToolDto } from './dto/create-tool.dto';
import { ListToolsQueryDto } from './dto/list-tools-query.dto';
import { ToolDto } from './dto/tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ToolsService } from './tools.service';

@ApiTags('inventory')
@Controller('inventory/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Registrar nueva herramienta o equipo de taller' })
  create(
    @Body() dto: CreateToolDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ToolDto> {
    return this.toolsService.create(dto, actor);
  }

  @Get()
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'Listar herramientas y equipos del taller' })
  findAll(
    @Query() query: ListToolsQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: ToolDto[]; total: number }> {
    return this.toolsService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'Obtener una herramienta o equipo por ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<ToolDto> {
    return this.toolsService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Actualizar datos o asignación de una herramienta' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateToolDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ToolDto> {
    return this.toolsService.update(id, dto, actor);
  }

  @Post(':id/photo')
  @RequirePermission('inventory:write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir/reemplazar foto de la herramienta' })
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  setPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ): Promise<ToolDto> {
    return this.toolsService.setPhoto(id, file, actor);
  }

  @Delete(':id')
  @RequirePermission('inventory:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar herramienta (soft-delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.toolsService.deactivate(id, actor);
  }
}
