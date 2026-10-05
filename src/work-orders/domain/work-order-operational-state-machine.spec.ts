import { BadRequestException } from '@nestjs/common';
import { OperationalStatus } from '@prisma/client';
import {
  assertOperationalTransition,
  canTransitionOperationalStatus,
} from './work-order-operational-state-machine';

describe('WorkOrderOperationalStateMachine', () => {
  it('permite transiciones válidas del flujo principal', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.RECIBIDA,
        OperationalStatus.EN_DIAGNOSTICO,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.EN_DIAGNOSTICO,
        OperationalStatus.EN_ESPERA_COTIZACION,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.EN_ESPERA_COTIZACION,
        OperationalStatus.EN_ESPERA_APROBACION,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.EN_ESPERA_APROBACION,
        OperationalStatus.EN_REPARACION,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.EN_REPARACION,
        OperationalStatus.CONTROL_CALIDAD,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.CONTROL_CALIDAD,
        OperationalStatus.LISTA_PARA_ENTREGA,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.LISTA_PARA_ENTREGA,
        OperationalStatus.ENTREGADA,
      ),
    ).toBe(true);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.ENTREGADA,
        OperationalStatus.CERRADA,
      ),
    ).toBe(true);
  });

  it('permite recotización desde EN_ESPERA_APROBACION a EN_ESPERA_COTIZACION', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.EN_ESPERA_APROBACION,
        OperationalStatus.EN_ESPERA_COTIZACION,
      ),
    ).toBe(true);
  });

  it('permite retrabajo desde CONTROL_CALIDAD a EN_REPARACION', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.CONTROL_CALIDAD,
        OperationalStatus.EN_REPARACION,
      ),
    ).toBe(true);
  });

  it('permite reclamación de garantía desde ENTREGADA a EN_GARANTIA', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.ENTREGADA,
        OperationalStatus.EN_GARANTIA,
      ),
    ).toBe(true);
  });

  it('permite transición al mismo estado (idempotente)', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.RECIBIDA,
        OperationalStatus.RECIBIDA,
      ),
    ).toBe(true);
  });

  it('rechaza saltos prohibidos como RECIBIDA -> EN_REPARACION sin cotización', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.RECIBIDA,
        OperationalStatus.EN_REPARACION,
      ),
    ).toBe(false);

    expect(() =>
      assertOperationalTransition(
        OperationalStatus.RECIBIDA,
        OperationalStatus.EN_REPARACION,
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza transiciones salientes desde estados terminales (CERRADA, CANCELADA)', () => {
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.CERRADA,
        OperationalStatus.RECIBIDA,
      ),
    ).toBe(false);
    expect(
      canTransitionOperationalStatus(
        OperationalStatus.CANCELADA,
        OperationalStatus.RECIBIDA,
      ),
    ).toBe(false);
  });
});
