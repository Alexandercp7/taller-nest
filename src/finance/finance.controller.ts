import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { AccountReceivableDto } from './dto/account-receivable.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { FinancialReportDto } from './dto/financial-report.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('receivables')
  @RequirePermission('finance:read')
  @ApiOperation({ summary: 'Listar cuentas por cobrar con saldos y estados' })
  findAllReceivables(
    @Query() query: ListReceivablesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: AccountReceivableDto[]; total: number }> {
    return this.financeService.findAllReceivables(query, actor);
  }

  @Get('cash-movements')
  @RequirePermission('finance:read')
  @ApiOperation({ summary: 'Consultar últimos movimientos del flujo de caja' })
  findAllCashMovements(
    @CurrentUser() actor: RequestUser,
  ): Promise<CashMovementDto[]> {
    return this.financeService.findAllCashMovements(actor);
  }

  @Post('cash-movements')
  @RequirePermission('finance:write')
  @ApiOperation({ summary: 'Registrar movimiento manual de caja (ingreso o egreso operativo)' })
  createCashMovement(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<CashMovementDto> {
    return this.financeService.createCashMovement(dto, actor);
  }

  @Get('report')
  @RequirePermission('report:read')
  @ApiOperation({ summary: 'Generar reporte financiero consolidado por agregación SQL' })
  getFinancialReport(
    @Query() query: FinancialReportQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<FinancialReportDto> {
    return this.financeService.getFinancialReport(query, actor);
  }
}
