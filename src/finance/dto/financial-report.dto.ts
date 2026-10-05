import { ApiProperty } from '@nestjs/swagger';

export class FinancialReportDto {
  @ApiProperty({ description: 'Total de pagos brutos recibidos' })
  grossPaymentsTotal!: string;

  @ApiProperty({ description: 'Total de comisiones cobradas por terminales bancarias' })
  terminalCommissionsTotal!: string;

  @ApiProperty({ description: 'Pagos netos recibidos (bruto - comisiones)' })
  netPaymentsTotal!: string;

  @ApiProperty({ description: 'Ingresos directos manuales registrados en caja' })
  directCashIncomeTotal!: string;

  @ApiProperty({ description: 'Egresos operativos directos registrados en caja' })
  directCashExpenseTotal!: string;

  @ApiProperty({ description: 'Flujo neto de caja en el período' })
  netCashFlow!: string;

  @ApiProperty({ description: 'Saldo total pendiente de cobro en cuentas por cobrar' })
  totalReceivablesBalance!: string;

  @ApiProperty({ description: 'Número de cuentas por cobrar con saldo pendiente' })
  openReceivablesCount!: number;
}
