import { BillingStatus } from '@prisma/client';

export interface FiscalDataInput {
  rfc?: string | null;
  businessName?: string | null;
  zipCode?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
}

export interface FiscalValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
  normalizedRfc?: string;
  normalizedZipCode?: string;
  normalizedTaxRegime?: string;
  normalizedCfdiUse?: string;
}

/**
 * Catálogo estándar de Régimen Fiscal del SAT (CFDI 4.0)
 */
export const VALID_TAX_REGIMES: ReadonlySet<string> = new Set([
  '601', // General de Ley Personas Morales
  '603', // Personas Morales con Fines no Lucrativos
  '605', // Sueldos y Salarios e Ingresos Asimilados a Salarios
  '606', // Arrendamiento
  '607', // Régimen de Enajenación o Adquisición de Bienes
  '608', // Demás ingresos
  '610', // Residentes en el Extranjero sin Establecimiento Permanente en México
  '611', // Ingresos por Dividendos (socios y accionistas)
  '612', // Personas Físicas con Actividades Empresariales y Profesionales
  '614', // Ingresos por intereses
  '615', // Régimen de los ingresos por obtención de premios
  '616', // Sin obligaciones fiscales
  '620', // Sociedades Cooperativas de Producción que optan por diferir sus ingresos
  '621', // Incorporación Fiscal
  '622', // Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  '623', // Opcional para Grupos de Sociedades
  '624', // Coordinados
  '625', // Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas
  '626', // Régimen Simplificado de Confianza (RESICO)
]);

/**
 * Catálogo estándar de Uso de CFDI del SAT (CFDI 4.0)
 */
export const VALID_CFDI_USES: ReadonlySet<string> = new Set([
  'G01', // Adquisición de mercancías
  'G02', // Devoluciones, descuentos o bonificaciones
  'G03', // Gastos en general
  'I01', // Construcciones
  'I02', // Mobilario y equipo de oficina por inversiones
  'I03', // Equipo de transporte
  'I04', // Equipo de computo y accesorios
  'I08', // Otra maquinaria y equipo
  'D01', // Honorarios médicos, dentales y gastos hospitalarios
  'D02', // Gastos médicos por incapacidad o discapacidad
  'D03', // Gastos funerales
  'D04', // Donaciones
  'D05', // Intereses reales efectivamente pagados por créditos hipotecarios
  'D07', // Primas por seguros de gastos médicos
  'D08', // Gastos de transportación escolar obligatoria
  'D10', // Pagos por servicios educativos (colegiaturas)
  'S01', // Sin efectos fiscales
  'CP01', // Pagos
  'CN01', // Nómina
]);

// Expresiones regulares SAT
const RFC_FISICA_REGEX = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
const RFC_MORAL_REGEX = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
const ZIP_CODE_REGEX = /^\d{5}$/;

export class FiscalDataValidator {
  /**
   * Valida un RFC mexicano (Física, Moral o Genérico Público en General / Extranjero).
   */
  static isValidRfc(rfc: string): boolean {
    const cleaned = rfc.trim().toUpperCase();
    if (cleaned === 'XAXX010101000' || cleaned === 'XEXX010101000') {
      return true;
    }
    if (cleaned.length === 13) {
      return RFC_FISICA_REGEX.test(cleaned);
    }
    if (cleaned.length === 12) {
      return RFC_MORAL_REGEX.test(cleaned);
    }
    return false;
  }

  /**
   * Valida integralmente los datos fiscales para emisión de CFDI.
   */
  static validate(data: FiscalDataInput): FiscalValidationResult {
    const missingFields: string[] = [];
    const errors: string[] = [];

    const rfc = data.rfc?.trim().toUpperCase();
    const businessName = data.businessName?.trim();
    const zipCode = data.zipCode?.trim();
    const taxRegime = data.taxRegime?.trim();
    const cfdiUse = data.cfdiUse?.trim().toUpperCase() || 'G03';

    if (!rfc) {
      missingFields.push('rfc');
    } else if (!this.isValidRfc(rfc)) {
      errors.push('El formato del RFC no es válido para personas físicas (13) o morales (12).');
    }

    if (!businessName) {
      missingFields.push('businessName');
    }

    if (!zipCode) {
      missingFields.push('zipCode');
    } else if (!ZIP_CODE_REGEX.test(zipCode)) {
      errors.push('El código postal fiscal debe contener exactamente 5 dígitos numéricos.');
    }

    if (!taxRegime) {
      missingFields.push('taxRegime');
    } else if (!VALID_TAX_REGIMES.has(taxRegime)) {
      errors.push(`El régimen fiscal '${taxRegime}' no pertenece al catálogo válido del SAT.`);
    }

    if (cfdiUse && !VALID_CFDI_USES.has(cfdiUse)) {
      errors.push(`El uso de CFDI '${cfdiUse}' no pertenece al catálogo válido del SAT.`);
    }

    const isValid = missingFields.length === 0 && errors.length === 0;

    return {
      isValid,
      missingFields,
      errors,
      normalizedRfc: rfc,
      normalizedZipCode: zipCode,
      normalizedTaxRegime: taxRegime,
      normalizedCfdiUse: cfdiUse,
    };
  }

  /**
   * Resuelve el BillingStatus según la necesidad de factura y la validez fiscal.
   */
  static resolveBillingStatus(
    requiresInvoice: boolean,
    fiscalValidation: { isValid: boolean },
  ): BillingStatus {
    if (!requiresInvoice) {
      return BillingStatus.NO_REQUERIDA;
    }
    return fiscalValidation.isValid
      ? BillingStatus.LISTA_PARA_FACTURAR
      : BillingStatus.PENDIENTE_DATOS;
  }
}
