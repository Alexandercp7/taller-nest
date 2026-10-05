import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { EmitInvoiceDto } from './dto/emit-invoice.dto';
import { InvoiceDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { PendingInvoiceItemDto } from './dto/pending-invoice-item.dto';
import { PendingInvoicesQueryDto } from './dto/pending-invoices-query.dto';
import { UpdateFiscalDataDto } from './dto/update-fiscal-data.dto';
import { InvoicingService } from './invoicing.service';

@ApiTags('invoicing')
@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get('pending')
  @RequirePermission('invoice:read')
  @ApiOperation({
    summary:
      'Bandeja de facturación pendiente: lista órdenes con estatus PENDIENTE_DATOS o LISTA_PARA_FACTURAR',
  })
  getPendingQueue(
    @Query() query: PendingInvoicesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{
    data: PendingInvoiceItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.invoicingService.getPendingQueue(query, actor);
  }

  @Put('work-orders/:woId/fiscal-data')
  @RequirePermission('invoice:write')
  @ApiOperation({
    summary:
      'Actualizar datos fiscales de cliente y orden; transiciona automáticamente a LISTA_PARA_FACTURAR si son válidos',
  })
  updateFiscalData(
    @Param('woId') woId: string,
    @Body() dto: UpdateFiscalDataDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.invoicingService.updateFiscalData(woId, dto, actor);
  }

  @Post('work-orders/:woId/emit')
  @RequirePermission('invoice:write')
  @ApiOperation({
    summary:
      'Emitir factura interna para una orden de trabajo lista para facturar',
  })
  emitInvoice(
    @Param('woId') woId: string,
    @Body() dto: EmitInvoiceDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<InvoiceDto> {
    return this.invoicingService.emitInvoice(woId, dto, actor);
  }

  @Get('invoices')
  @RequirePermission('invoice:read')
  @ApiOperation({
    summary: 'Listado histórico paginado de facturas emitidas y canceladas',
  })
  findAllInvoices(
    @Query() query: InvoicesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{
    data: InvoiceDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.invoicingService.findAllInvoices(query, actor);
  }

  @Get('invoices/:id')
  @RequirePermission('invoice:read')
  @ApiOperation({
    summary: 'Obtener detalle completo de una factura por su ID',
  })
  findOneInvoice(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<InvoiceDto> {
    return this.invoicingService.findOneInvoice(id, actor);
  }

  @Post('invoices/:id/cancel')
  @RequirePermission('invoice:write')
  @ApiOperation({
    summary: 'Cancelar una factura emitida y revertir estatus en orden de trabajo',
  })
  cancelInvoice(
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<InvoiceDto> {
    return this.invoicingService.cancelInvoice(id, dto, actor);
  }
}
