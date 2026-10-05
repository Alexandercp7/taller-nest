import { BadRequestException } from '@nestjs/common';
import { OperationalStatus } from '@prisma/client';

export const OPERATIONAL_STATUS_TRANSITIONS: Record<
  OperationalStatus,
  readonly OperationalStatus[]
> = {
  [OperationalStatus.RECIBIDA]: [
    OperationalStatus.EN_DIAGNOSTICO,
    OperationalStatus.CANCELADA,
  ],
  [OperationalStatus.EN_DIAGNOSTICO]: [
    OperationalStatus.EN_ESPERA_COTIZACION,
    OperationalStatus.CANCELADA,
  ],
  [OperationalStatus.EN_ESPERA_COTIZACION]: [
    OperationalStatus.EN_ESPERA_APROBACION,
    OperationalStatus.CANCELADA,
  ],
  [OperationalStatus.EN_ESPERA_APROBACION]: [
    OperationalStatus.EN_REPARACION,
    OperationalStatus.EN_ESPERA_COTIZACION,
    OperationalStatus.CANCELADA,
  ],
  [OperationalStatus.EN_REPARACION]: [
    OperationalStatus.CONTROL_CALIDAD,
  ],
  [OperationalStatus.CONTROL_CALIDAD]: [
    OperationalStatus.LISTA_PARA_ENTREGA,
    OperationalStatus.EN_REPARACION,
  ],
  [OperationalStatus.LISTA_PARA_ENTREGA]: [
    OperationalStatus.ENTREGADA,
  ],
  [OperationalStatus.ENTREGADA]: [
    OperationalStatus.CERRADA,
    OperationalStatus.EN_GARANTIA,
  ],
  [OperationalStatus.EN_GARANTIA]: [
    OperationalStatus.EN_REPARACION,
  ],
  [OperationalStatus.CERRADA]: [],
  [OperationalStatus.CANCELADA]: [],
};

export function canTransitionOperationalStatus(
  current: OperationalStatus,
  next: OperationalStatus,
): boolean {
  if (current === next) return true;
  const allowed = OPERATIONAL_STATUS_TRANSITIONS[current] ?? [];
  return allowed.includes(next);
}

export function assertOperationalTransition(
  current: OperationalStatus,
  next: OperationalStatus,
): void {
  if (!canTransitionOperationalStatus(current, next)) {
    throw new BadRequestException(
      `Transición de estado operativo no permitida: de '${current}' a '${next}'.`,
    );
  }
}
