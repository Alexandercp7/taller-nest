export class InvoiceNumberGenerator {
  /**
   * Genera el identificador secuencial de factura para un taller (ej. FAC-0001).
   * @param prefix Prefijo del comprobante (default: 'FAC')
   * @param sequence Número consecutivo positivo
   * @param padding Dígitos mínimos de relleno con ceros a la izquierda (default: 4)
   */
  static formatInvoiceNumber(
    sequence: number,
    prefix: string = 'FAC',
    padding: number = 4,
  ): string {
    if (!Number.isInteger(sequence) || sequence <= 0) {
      throw new Error('El número secuencial de factura debe ser un entero positivo mayor a cero.');
    }
    const cleanPrefix = (prefix || 'FAC').trim().toUpperCase();
    const paddedNumber = sequence.toString().padStart(padding, '0');
    return `${cleanPrefix}-${paddedNumber}`;
  }
}
