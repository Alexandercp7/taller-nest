import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { BalanceValidator } from './balance-validator';

describe('BalanceValidator', () => {
  it('validates a correct cash payment against balance', () => {
    const result = BalanceValidator.validate(
      '500.00',
      new Prisma.Decimal('1000.00'),
      PaymentMethod.CASH,
    );

    expect(result.amount.toFixed(2)).toBe('500.00');
    expect(result.terminalCommission.toFixed(2)).toBe('0.00');
    expect(result.netAmount.toFixed(2)).toBe('500.00');
  });

  it('validates a card payment with terminal commission', () => {
    const result = BalanceValidator.validate(
      '1000.00',
      new Prisma.Decimal('1000.00'),
      PaymentMethod.CARD,
      '35.00',
    );

    expect(result.amount.toFixed(2)).toBe('1000.00');
    expect(result.terminalCommission.toFixed(2)).toBe('35.00');
    expect(result.netAmount.toFixed(2)).toBe('965.00');
  });

  it('allows advance payment when balance is null (order not yet closed)', () => {
    const result = BalanceValidator.validate(
      '800.00',
      null,
      PaymentMethod.TRANSFER,
    );

    expect(result.amount.toFixed(2)).toBe('800.00');
  });

  it('throws when amount is zero or negative', () => {
    expect(() =>
      BalanceValidator.validate('0.00', new Prisma.Decimal('100.00'), PaymentMethod.CASH),
    ).toThrow(BadRequestException);

    expect(() =>
      BalanceValidator.validate('-50.00', new Prisma.Decimal('100.00'), PaymentMethod.CASH),
    ).toThrow(BadRequestException);
  });

  it('throws when amount exceeds balance', () => {
    expect(() =>
      BalanceValidator.validate('500.01', new Prisma.Decimal('500.00'), PaymentMethod.CASH),
    ).toThrow(BadRequestException);
  });

  it('throws when commission is specified for non-card payments', () => {
    expect(() =>
      BalanceValidator.validate(
        '500.00',
        new Prisma.Decimal('1000.00'),
        PaymentMethod.CASH,
        '15.00',
      ),
    ).toThrow(BadRequestException);
  });

  it('throws when commission is greater than or equal to amount', () => {
    expect(() =>
      BalanceValidator.validate(
        '100.00',
        new Prisma.Decimal('1000.00'),
        PaymentMethod.CARD,
        '100.00',
      ),
    ).toThrow(BadRequestException);
  });
});
