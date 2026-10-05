import { BillingStatus } from '@prisma/client';
import { FiscalDataValidator } from './fiscal-data-validator';

describe('FiscalDataValidator', () => {
  describe('isValidRfc', () => {
    it('should validate standard persona fisica RFC (13 chars)', () => {
      expect(FiscalDataValidator.isValidRfc('PEPJ8001019Q8')).toBe(true);
      expect(FiscalDataValidator.isValidRfc('GODE561231GR8')).toBe(true);
    });

    it('should validate standard persona moral RFC (12 chars)', () => {
      expect(FiscalDataValidator.isValidRfc('AAA010101AAA')).toBe(true);
      expect(FiscalDataValidator.isValidRfc('IMS421231I45')).toBe(true);
    });

    it('should validate generic SAT RFCs', () => {
      expect(FiscalDataValidator.isValidRfc('XAXX010101000')).toBe(true);
      expect(FiscalDataValidator.isValidRfc('XEXX010101000')).toBe(true);
      expect(FiscalDataValidator.isValidRfc('xaxx010101000')).toBe(true);
    });

    it('should reject invalid RFC formats', () => {
      expect(FiscalDataValidator.isValidRfc('')).toBe(false);
      expect(FiscalDataValidator.isValidRfc('INVALID')).toBe(false);
      expect(FiscalDataValidator.isValidRfc('1234567890123')).toBe(false);
      expect(FiscalDataValidator.isValidRfc('TOOLONGRFC12345')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should succeed when all valid fiscal data is provided', () => {
      const result = FiscalDataValidator.validate({
        rfc: 'PEPJ8001019Q8',
        businessName: 'JUAN PEREZ PEREZ',
        zipCode: '03100',
        taxRegime: '612',
        cfdiUse: 'G03',
      });

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedRfc).toBe('PEPJ8001019Q8');
      expect(result.normalizedZipCode).toBe('03100');
      expect(result.normalizedTaxRegime).toBe('612');
      expect(result.normalizedCfdiUse).toBe('G03');
    });

    it('should report missing fields', () => {
      const result = FiscalDataValidator.validate({});

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['rfc', 'businessName', 'zipCode', 'taxRegime']);
    });

    it('should report format errors for invalid RFC, zipCode and taxRegime', () => {
      const result = FiscalDataValidator.validate({
        rfc: 'INVALID_RFC',
        businessName: 'EMPRESA SA DE CV',
        zipCode: '123',
        taxRegime: '999',
        cfdiUse: 'UNKNOWN',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors.some((e) => e.includes('RFC'))).toBe(true);
      expect(result.errors.some((e) => e.includes('código postal'))).toBe(true);
      expect(result.errors.some((e) => e.includes('régimen fiscal'))).toBe(true);
      expect(result.errors.some((e) => e.includes('uso de CFDI'))).toBe(true);
    });

    it('should default cfdiUse to G03 if not provided but other fields are valid', () => {
      const result = FiscalDataValidator.validate({
        rfc: 'AAA010101AAA',
        businessName: 'EMPRESA SA DE CV',
        zipCode: '06600',
        taxRegime: '601',
      });

      expect(result.isValid).toBe(true);
      expect(result.normalizedCfdiUse).toBe('G03');
    });
  });

  describe('resolveBillingStatus', () => {
    it('should return NO_REQUERIDA if requiresInvoice is false', () => {
      expect(FiscalDataValidator.resolveBillingStatus(false, { isValid: true })).toBe(
        BillingStatus.NO_REQUERIDA,
      );
      expect(FiscalDataValidator.resolveBillingStatus(false, { isValid: false })).toBe(
        BillingStatus.NO_REQUERIDA,
      );
    });

    it('should return PENDIENTE_DATOS if requiresInvoice is true but validation failed', () => {
      expect(FiscalDataValidator.resolveBillingStatus(true, { isValid: false })).toBe(
        BillingStatus.PENDIENTE_DATOS,
      );
    });

    it('should return LISTA_PARA_FACTURAR if requiresInvoice is true and validation succeeded', () => {
      expect(FiscalDataValidator.resolveBillingStatus(true, { isValid: true })).toBe(
        BillingStatus.LISTA_PARA_FACTURAR,
      );
    });
  });
});
