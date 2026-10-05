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
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PhotoCategory } from '@prisma/client';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { imageUploadOptions } from '@common/uploads/image-upload.config';
import { ChangeOperationalStatusDto } from './dto/change-operational-status.dto';
import { CreateOtNoteDto } from './dto/create-ot-note.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { OtNoteDto } from './dto/ot-note.dto';
import { OtPhotoDto } from './dto/ot-photo.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderDto } from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Crear nueva orden de trabajo con recepción y checklist' })
  create(
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<WorkOrderDto> {
    return this.workOrdersService.create(dto, actor);
  }

  @Get()
  @RequirePermission('work-order:read')
  @ApiOperation({ summary: 'Listar órdenes de trabajo con filtros y búsqueda' })
  findAll(
    @Query() query: ListWorkOrdersQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: WorkOrderDto[]; total: number }> {
    return this.workOrdersService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('work-order:read')
  @ApiOperation({ summary: 'Obtener detalle completo del agregado de la orden de trabajo' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<WorkOrderDto> {
    return this.workOrdersService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Actualizar datos de la orden de trabajo o diagnóstico' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<WorkOrderDto> {
    return this.workOrdersService.update(id, dto, actor);
  }

  @Post(':id/status')
  @RequirePermission('work-order:status')
  @ApiOperation({ summary: 'Avanzar o cambiar estado operativo de la OT (validado por FSM)' })
  changeOperationalStatus(
    @Param('id') id: string,
    @Body() dto: ChangeOperationalStatusDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<WorkOrderDto> {
    return this.workOrdersService.changeOperationalStatus(id, dto, actor);
  }

  @Patch(':id/delayed')
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Marcar o desmarcar la orden de trabajo como retrasada' })
  toggleDelayed(
    @Param('id') id: string,
    @Body('estaRetrasada') estaRetrasada: boolean,
    @CurrentUser() actor: RequestUser,
  ): Promise<WorkOrderDto> {
    return this.workOrdersService.toggleDelayed(id, estaRetrasada, actor);
  }

  @Post(':id/notes')
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Agregar nota interna o visible al cliente en la OT' })
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateOtNoteDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<OtNoteDto> {
    return this.workOrdersService.addNote(id, dto, actor);
  }

  @Post(':id/photos')
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Subir fotografía categorizada a la OT (almacenada en R2)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: Object.values(PhotoCategory) },
        isPublic: { type: 'boolean' },
        caption: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: PhotoCategory = PhotoCategory.RECEPTION,
    @Body('isPublic') isPublic: boolean = false,
    @Body('caption') caption: string | undefined,
    @CurrentUser() actor: RequestUser,
  ): Promise<OtPhotoDto> {
    return this.workOrdersService.uploadPhoto(
      id,
      file,
      category,
      String(isPublic) === 'true' || isPublic === true,
      caption,
      actor,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('work-order:write')
  @ApiOperation({ summary: 'Eliminar orden de trabajo (solo permitido en RECIBIDA o CANCELADA)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    return this.workOrdersService.remove(id, actor);
  }
}
