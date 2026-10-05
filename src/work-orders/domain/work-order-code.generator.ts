/**
 * Formatea un número secuencial como código de OT, p. ej. 1 -> "OT-0001".
 */
export function formatWorkOrderCode(seq: number): string {
  const padded = String(seq).padStart(4, '0');
  return `OT-${padded}`;
}

/**
 * Extrae el número secuencial de un código "OT-0042" -> 42.
 */
export function parseWorkOrderCodeSeq(code: string): number | null {
  const match = /^OT-(\d+)$/.exec(code.trim());
  return match ? parseInt(match[1], 10) : null;
}
