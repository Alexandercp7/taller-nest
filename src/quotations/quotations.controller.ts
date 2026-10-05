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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { ApproveQuotationLinesDto } from './dto/approve-quotation-lines.dto';
import { CreateQuotationLineDto } from './dto/create-quotation-line.dto';
import { OverrideLinePriceDto } from './dto/override-line-price.dto';
import { QuotationLineDto } from './dto/quotation-line.dto';
import { QuotationDto } from './dto/quotation.dto';
import { SetQuotationDiscountDto } from './dto/set-quotation-discount.dto';
import { UpdateQuotationLineDto } from './dto/update-quotation-line.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('quotations')
@Controller('work-orders/:woId/quotation')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @RequirePermission('quotation:read')
  @ApiOperation({ summary: 'Consultar cotización y presupuesto de la orden de trabajo' })
  getQuotation(
    @Param('woId') woId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationDto> {
    return this.quotationsService.getQuotationByWorkOrder(woId, actor);
  }

  @Post('lines')
  @RequirePermission('quotation:write')
  @ApiOperation({
    summary:
      'Agregar línea de cotización (servicio de mano de obra o refacción con resolución automática de precio)',
  })
  addLine(
    @Param('woId') woId: string,
    @Body() dto: CreateQuotationLineDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationLineDto> {
    return this.quotationsService.addLine(woId, dto, actor);
  }

  @Patch('lines/:lineId')
  @RequirePermission('quotation:write')
  @ApiOperation({ summary: 'Actualizar cantidad o concepto de una línea de cotización' })
  updateLine(
    @Param('woId') woId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateQuotationLineDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationLineDto> {
    return this.quotationsService.updateLine(woId, lineId, dto, actor);
  }

  @Patch('lines/:lineId/override-price')
  @RequirePermission('quotation:override-price')
  @ApiOperation({
    summary: 'Ajuste / override de precio final de una línea con motivo obligatorio y auditoría',
  })
  overridePrice(
    @Param('woId') woId: string,
    @Param('lineId') lineId: string,
    @Body() dto: OverrideLinePriceDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationLineDto> {
    return this.quotationsService.overridePrice(woId, lineId, dto, actor);
  }

  @Post('approve')
  @RequirePermission('quotation:approve')
  @ApiOperation({ summary: 'Registrar aprobación o rechazo granular del cliente línea por línea' })
  approveLines(
    @Param('woId') woId: string,
    @Body() dto: ApproveQuotationLinesDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationDto> {
    return this.quotationsService.approveLines(woId, dto, actor);
  }

  @Post('discount')
  @RequirePermission('quotation:write')
  @ApiOperation({ summary: 'Aplicar descuento global (porcentaje o monto fijo) y configurar IVA' })
  setDiscount(
    @Param('woId') woId: string,
    @Body() dto: SetQuotationDiscountDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<QuotationDto> {
    return this.quotationsService.setDiscount(woId, dto, actor);
  }

  @Delete('lines/:lineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('quotation:write')
  @ApiOperation({ summary: 'Eliminar una línea de cotización' })
  removeLine(
    @Param('woId') woId: string,
    @Param('lineId') lineId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    return this.quotationsService.removeLine(woId, lineId, actor);
  }
}
