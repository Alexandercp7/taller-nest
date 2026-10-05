import { Prisma } from '@prisma/client';

export interface FinancialAggregatesInput {
  grossPaymentsTotal: Prisma.Decimal;
  terminalCommissionsTotal: Prisma.Decimal;
  directCashIncomeTotal: Prisma.Decimal;
  directCashExpenseTotal: Prisma.Decimal;
  totalReceivablesBalance: Prisma.Decimal;
  openReceivablesCount: number;
}

export interface FinancialReportResult {
  grossPaymentsTotal: string;
  terminalCommissionsTotal: string;
  netPaymentsTotal: string;
  directCashIncomeTotal: string;
  directCashExpenseTotal: string;
  netCashFlow: string;
  totalReceivablesBalance: string;
  openReceivablesCount: number;
}

export class FinancialReportCalculator {
  static calculate(input: FinancialAggregatesInput): FinancialReportResult {
    const netPayments = input.grossPaymentsTotal.minus(
      input.terminalCommissionsTotal,
    );
    const netCashFlow = netPayments
      .plus(input.directCashIncomeTotal)
      .minus(input.directCashExpenseTotal);

    return {
      grossPaymentsTotal: input.grossPaymentsTotal.toFixed(2),
      terminalCommissionsTotal: input.terminalCommissionsTotal.toFixed(2),
      netPaymentsTotal: netPayments.toFixed(2),
      directCashIncomeTotal: input.directCashIncomeTotal.toFixed(2),
      directCashExpenseTotal: input.directCashExpenseTotal.toFixed(2),
      netCashFlow: netCashFlow.toFixed(2),
      totalReceivablesBalance: input.totalReceivablesBalance.toFixed(2),
      openReceivablesCount: input.openReceivablesCount,
    };
  }
}
