import { DiscountType, QuotationApprovalStatus } from '@prisma/client';
import {
  calculateQuotation,
  resolveClientApprovalStatus,
} from './quotation-calculator';

describe('QuotationCalculator', () => {
  it('calcula subtotal, IVA del 16% y total correctamente sin descuento', () => {
    const input = {
      lines: [
        { quantity: 2, finalPrice: '500.00' }, // 1000.00
        { quantity: 1, finalPrice: '250.00' }, // 250.00
      ],
      aplicaIva: true,
    };

    const result = calculateQuotation(input);

    expect(result.subtotal.toString()).toBe('1250');
    expect(result.discountAmount.toString()).toBe('0');
    expect(result.taxBase.toString()).toBe('1250');
    expect(result.taxAmount.toString()).toBe('200'); // 1250 * 0.16 = 200
    expect(result.total.toString()).toBe('1450');
  });

  it('calcula descuento porcentual antes de IVA', () => {
    const input = {
      lines: [{ quantity: 1, finalPrice: '1000.00' }],
      discountType: DiscountType.PERCENT,
      discountValue: '10', // 10% = 100.00
      aplicaIva: true,
    };

    const result = calculateQuotation(input);

    expect(result.subtotal.toString()).toBe('1000');
    expect(result.discountAmount.toString()).toBe('100');
    expect(result.taxBase.toString()).toBe('900');
    expect(result.taxAmount.toString()).toBe('144'); // 900 * 0.16 = 144
    expect(result.total.toString()).toBe('1044');
  });

  it('calcula descuento de monto fijo antes de IVA', () => {
    const input = {
      lines: [{ quantity: 1, finalPrice: '1000.00' }],
      discountType: DiscountType.FIXED,
      discountValue: '200.00',
      aplicaIva: true,
    };

    const result = calculateQuotation(input);

    expect(result.subtotal.toString()).toBe('1000');
    expect(result.discountAmount.toString()).toBe('200');
    expect(result.taxBase.toString()).toBe('800');
    expect(result.taxAmount.toString()).toBe('128'); // 800 * 0.16 = 128
    expect(result.total.toString()).toBe('928');
  });

  it('no aplica IVA si aplicaIva es false', () => {
    const input = {
      lines: [{ quantity: 1, finalPrice: '1000.00' }],
      aplicaIva: false,
    };

    const result = calculateQuotation(input);

    expect(result.subtotal.toString()).toBe('1000');
    expect(result.taxAmount.toString()).toBe('0');
    expect(result.total.toString()).toBe('1000');
  });

  describe('resolveClientApprovalStatus', () => {
    it('retorna APPROVED si todas las líneas están aprobadas', () => {
      const lines = [
        { approvalStatus: QuotationApprovalStatus.APPROVED },
        { approvalStatus: QuotationApprovalStatus.APPROVED },
      ];
      expect(resolveClientApprovalStatus(lines)).toBe(
        QuotationApprovalStatus.APPROVED,
      );
    });

    it('retorna REJECTED si todas las líneas están rechazadas', () => {
      const lines = [
        { approvalStatus: QuotationApprovalStatus.REJECTED },
        { approvalStatus: QuotationApprovalStatus.REJECTED },
      ];
      expect(resolveClientApprovalStatus(lines)).toBe(
        QuotationApprovalStatus.REJECTED,
      );
    });

    it('retorna APPROVED (parcial) si al menos una está aprobada', () => {
      const lines = [
        { approvalStatus: QuotationApprovalStatus.APPROVED },
        { approvalStatus: QuotationApprovalStatus.REJECTED },
      ];
      expect(resolveClientApprovalStatus(lines)).toBe(
        QuotationApprovalStatus.APPROVED,
      );
    });

    it('retorna PENDING si no hay aprobadas ni rechazadas', () => {
      const lines = [{ approvalStatus: QuotationApprovalStatus.PENDING }];
      expect(resolveClientApprovalStatus(lines)).toBe(
        QuotationApprovalStatus.PENDING,
      );
    });
  });
});
