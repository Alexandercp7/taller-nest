import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';

export interface ValidatedPaymentAmounts {
  amount: Prisma.Decimal;
  terminalCommission: Prisma.Decimal;
  netAmount: Prisma.Decimal;
}

export class BalanceValidator {
  static validate(
    amountStr: string,
    balance: Prisma.Decimal | null,
    method: PaymentMethod,
    commissionStr?: string,
  ): ValidatedPaymentAmounts {
    const amount = new Prisma.Decimal(amountStr);

    if (amount.lte(0)) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0.');
    }

    if (balance !== null && amount.gt(balance)) {
      throw new BadRequestException(
        `El pago ($${amount.toFixed(2)}) no puede exceder el saldo pendiente ($${balance.toFixed(2)}).`,
      );
    }

    const terminalCommission = commissionStr
      ? new Prisma.Decimal(commissionStr)
      : new Prisma.Decimal('0.00');

    if (terminalCommission.lt(0)) {
      throw new BadRequestException('La comisión de terminal no puede ser negativa.');
    }

    if (terminalCommission.gte(amount)) {
      throw new BadRequestException(
        'La comisión de terminal no puede ser igual o mayor al monto total del pago.',
      );
    }

    if (method !== PaymentMethod.CARD && terminalCommission.gt(0)) {
      throw new BadRequestException(
        'Las comisiones de terminal bancaria únicamente aplican a pagos realizados con tarjeta (CARD).',
      );
    }

    const netAmount = amount.minus(terminalCommission);

    return {
      amount,
      terminalCommission,
      netAmount,
    };
  }
}
