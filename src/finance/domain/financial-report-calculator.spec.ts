import { Prisma } from '@prisma/client';
import { FinancialReportCalculator } from './financial-report-calculator';

describe('FinancialReportCalculator', () => {
  it('calculates net payments and cash flow accurately', () => {
    const result = FinancialReportCalculator.calculate({
      grossPaymentsTotal: new Prisma.Decimal('10000.00'),
      terminalCommissionsTotal: new Prisma.Decimal('350.00'),
      directCashIncomeTotal: new Prisma.Decimal('1500.00'),
      directCashExpenseTotal: new Prisma.Decimal('2000.00'),
      totalReceivablesBalance: new Prisma.Decimal('4500.00'),
      openReceivablesCount: 3,
    });

    // Net payments = 10000 - 350 = 9650
    expect(result.grossPaymentsTotal).toBe('10000.00');
    expect(result.terminalCommissionsTotal).toBe('350.00');
    expect(result.netPaymentsTotal).toBe('9650.00');
    // Net cash flow = 9650 + 1500 - 2000 = 9150
    expect(result.netCashFlow).toBe('9150.00');
    expect(result.totalReceivablesBalance).toBe('4500.00');
    expect(result.openReceivablesCount).toBe(3);
  });

  it('handles zero values cleanly without floating point issues', () => {
    const result = FinancialReportCalculator.calculate({
      grossPaymentsTotal: new Prisma.Decimal('0.00'),
      terminalCommissionsTotal: new Prisma.Decimal('0.00'),
      directCashIncomeTotal: new Prisma.Decimal('0.00'),
      directCashExpenseTotal: new Prisma.Decimal('0.00'),
      totalReceivablesBalance: new Prisma.Decimal('0.00'),
      openReceivablesCount: 0,
    });

    expect(result.netPaymentsTotal).toBe('0.00');
    expect(result.netCashFlow).toBe('0.00');
    expect(result.openReceivablesCount).toBe(0);
  });
});
