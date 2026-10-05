import { InvoiceNumberGenerator } from './invoice-number-generator';

describe('InvoiceNumberGenerator', () => {
  it('should format sequence 1 as FAC-0001 with default options', () => {
    expect(InvoiceNumberGenerator.formatInvoiceNumber(1)).toBe('FAC-0001');
  });

  it('should format higher sequence numbers with proper padding', () => {
    expect(InvoiceNumberGenerator.formatInvoiceNumber(42)).toBe('FAC-0042');
    expect(InvoiceNumberGenerator.formatInvoiceNumber(999)).toBe('FAC-0999');
    expect(InvoiceNumberGenerator.formatInvoiceNumber(1000)).toBe('FAC-1000');
    expect(InvoiceNumberGenerator.formatInvoiceNumber(10000)).toBe('FAC-10000');
  });

  it('should support custom prefixes', () => {
    expect(InvoiceNumberGenerator.formatInvoiceNumber(5, 'INV')).toBe('INV-0005');
    expect(InvoiceNumberGenerator.formatInvoiceNumber(5, 'nc')).toBe('NC-0005');
  });

  it('should throw on non-positive integers', () => {
    expect(() => InvoiceNumberGenerator.formatInvoiceNumber(0)).toThrow();
    expect(() => InvoiceNumberGenerator.formatInvoiceNumber(-1)).toThrow();
    expect(() => InvoiceNumberGenerator.formatInvoiceNumber(1.5)).toThrow();
  });
});
