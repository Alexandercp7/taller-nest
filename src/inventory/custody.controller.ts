import {
  Body,
  Controller,
  Get,
  Param,
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
import { CustodyService } from './custody.service';
import { CreateCustodyItemDto } from './dto/create-custody-item.dto';
import { CustodyItemDto } from './dto/custody-item.dto';
import { ListCustodyQueryDto } from './dto/list-custody-query.dto';

@ApiTags('inventory')
@Controller('inventory/custody')
export class CustodyController {
  constructor(private readonly custodyService: CustodyService) {}

  @Post()
  @RequirePermission('inventory:custody-write')
  @ApiOperation({ summary: 'Registrar pieza en custodia' })
  create(
    @Body() dto: CreateCustodyItemDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustodyItemDto> {
    return this.custodyService.create(dto, actor);
  }

  @Get()
  @RequirePermission('inventory:custody-read')
  @ApiOperation({ summary: 'Listar piezas en custodia' })
  findAll(
    @Query() query: ListCustodyQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: CustodyItemDto[]; total: number }> {
    return this.custodyService.findAll(query, actor);
  }

  @Get(':id')
  @RequirePermission('inventory:custody-read')
  @ApiOperation({ summary: 'Obtener una pieza en custodia' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustodyItemDto> {
    return this.custodyService.findOne(id, actor);
  }

  @Post(':id/photo')
  @RequirePermission('inventory:custody-write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir/reemplazar la foto de una pieza en custodia',
  })
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  setPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustodyItemDto> {
    return this.custodyService.setPhoto(id, file, actor);
  }

  @Post(':id/return')
  @RequirePermission('inventory:custody-write')
  @ApiOperation({ summary: 'Marcar pieza en custodia como devuelta' })
  markReturned(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustodyItemDto> {
    return this.custodyService.markReturned(id, actor);
  }
}
