import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, ValidationArguments } from 'class-validator';

const MONEY_STRING_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Dinero como string decimal con hasta 2 dígitos (regla 4: Decimal(12,2), nunca Float).
 * Ej. "450.00". El monto real se parsea a Prisma.Decimal en el service.
 */
export function IsMoneyString() {
  return applyDecorators(
    IsString(),
    Matches(MONEY_STRING_PATTERN, {
      message: (args: ValidationArguments) =>
        `${args.property} debe ser un decimal con hasta 2 dígitos, p. ej. 450.00`,
    }),
  );
}
