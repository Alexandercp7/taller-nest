import { BadRequestException } from '@nestjs/common';
import {
  BillingStatus,
  CommercialStatus,
  DiscountType,
  OperationalStatus,
  Prisma,
  QuotationApprovalStatus,
  QuotationLineType,
} from '@prisma/client';
import { CommercialCloseResolver } from './commercial-close-resolver';

describe('CommercialCloseResolver', () => {
  const baseOrder = {
    operationalStatus: OperationalStatus.ENTREGADA,
    client: { rfc: 'XAXX010101000' },
    quotation: {
      discountType: null,
      discountValue: null,
      aplicaIva: true,
      lines: [
        {
          lineType: QuotationLineType.SERVICE,
          quantity: 1,
          finalPrice: new Prisma.Decimal('1000.00'),
          approvalStatus: QuotationApprovalStatus.APPROVED,
        },
        {
          lineType: QuotationLineType.PART,
          quantity: 1,
          finalPrice: new Prisma.Decimal('500.00'),
          approvalStatus: QuotationApprovalStatus.REJECTED,
        },
      ],
    },
  };

  it('calculates frozenTotal using only approved lines with IVA', () => {
    const res = CommercialCloseResolver.resolve(baseOrder, false);

    // 1000 + 16% IVA = 1160.00 (the 500 rejected line is excluded)
    expect(res.frozenTotal.toFixed(2)).toBe('1160.00');
    expect(res.approvedLinesCount).toBe(1);
    expect(res.billingStatus).toBe(BillingStatus.NO_REQUERIDA);
  });

  it('resolves PENDIENTE_DATOS when invoice is requested but client has generic RFC', () => {
    const res = CommercialCloseResolver.resolve(baseOrder, true);
    expect(res.billingStatus).toBe(BillingStatus.PENDIENTE_DATOS);
  });

  it('resolves LISTA_PARA_FACTURAR when invoice is requested and client has valid RFC', () => {
    const orderWithRealRfc = {
      ...baseOrder,
      client: { rfc: 'MEC920401H82' },
    };
    const res = CommercialCloseResolver.resolve(orderWithRealRfc, true);
    expect(res.billingStatus).toBe(BillingStatus.LISTA_PARA_FACTURAR);
  });

  it('throws BadRequestException if operationalStatus is not allowed for closing', () => {
    const invalidOrder = {
      ...baseOrder,
      operationalStatus: OperationalStatus.EN_DIAGNOSTICO,
    };
    expect(() => CommercialCloseResolver.resolve(invalidOrder, false)).toThrow(
      BadRequestException,
    );
  });

  describe('resolveCommercialStatus', () => {
    it('resolves COBRADA_TOTAL when balance is zero', () => {
      const status = CommercialCloseResolver.resolveCommercialStatus(
        new Prisma.Decimal('0.00'),
        new Prisma.Decimal('1000.00'),
      );
      expect(status).toBe(CommercialStatus.COBRADA_TOTAL);
    });

    it('resolves COBRADA_PARCIAL when partially paid', () => {
      const status = CommercialCloseResolver.resolveCommercialStatus(
        new Prisma.Decimal('400.00'),
        new Prisma.Decimal('1000.00'),
      );
      expect(status).toBe(CommercialStatus.COBRADA_PARCIAL);
    });

    it('resolves CIERRE_PENDIENTE when nothing has been paid', () => {
      const status = CommercialCloseResolver.resolveCommercialStatus(
        new Prisma.Decimal('1000.00'),
        new Prisma.Decimal('1000.00'),
      );
      expect(status).toBe(CommercialStatus.CIERRE_PENDIENTE);
    });
  });
});
