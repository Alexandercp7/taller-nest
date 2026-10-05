import {
  formatWorkOrderCode,
  parseWorkOrderCodeSeq,
} from './work-order-code.generator';

describe('WorkOrderCodeGenerator', () => {
  it('formatea números con padding de 4 dígitos', () => {
    expect(formatWorkOrderCode(1)).toBe('OT-0001');
    expect(formatWorkOrderCode(42)).toBe('OT-0042');
    expect(formatWorkOrderCode(9999)).toBe('OT-9999');
    expect(formatWorkOrderCode(10000)).toBe('OT-10000');
  });

  it('extrae el número secuencial correctamente', () => {
    expect(parseWorkOrderCodeSeq('OT-0001')).toBe(1);
    expect(parseWorkOrderCodeSeq('OT-0150')).toBe(150);
    expect(parseWorkOrderCodeSeq('INVALID')).toBeNull();
  });
});
