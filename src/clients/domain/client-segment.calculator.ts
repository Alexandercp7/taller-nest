import { ClientSegment } from '@prisma/client';

export interface ClientSegmentThresholds {
  frecuente: number;
  antiguo: number;
}

export function calculateClientSegment(
  fullyPaidOrdersCount: number,
  thresholds: ClientSegmentThresholds,
): ClientSegment {
  if (fullyPaidOrdersCount >= thresholds.antiguo) return ClientSegment.ANTIGUO;
  if (fullyPaidOrdersCount >= thresholds.frecuente)
    return ClientSegment.FRECUENTE;
  return ClientSegment.NUEVO;
}
