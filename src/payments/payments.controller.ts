import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentSummaryDto } from './dto/payment-summary.dto';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('work-orders/:woId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermission('payment:write')
  @ApiOperation({
    summary:
      'Registrar abono, anticipo o liquidación de una orden de trabajo (valida saldo deudor)',
  })
  create(
    @Param('woId') woId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<PaymentDto> {
    return this.paymentsService.create(woId, dto, actor);
  }

  @Get()
  @RequirePermission('finance:read')
  @ApiOperation({ summary: 'Listar historial de pagos de la orden de trabajo' })
  findByWorkOrder(
    @Param('woId') woId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<PaymentDto[]> {
    return this.paymentsService.findByWorkOrder(woId, actor);
  }

  @Get('summary')
  @RequirePermission('finance:read')
  @ApiOperation({
    summary:
      'Obtener resumen financiero completo de pagos, saldo y estado de CxC de la OT',
  })
  getSummary(
    @Param('woId') woId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<PaymentSummaryDto> {
    return this.paymentsService.getSummary(woId, actor);
  }
}
