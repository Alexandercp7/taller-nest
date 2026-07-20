import { ClientSegment } from '@prisma/client';
import {
  calculateClientSegment,
  ClientSegmentThresholds,
} from './client-segment.calculator';

describe('calculateClientSegment', () => {
  const thresholds: ClientSegmentThresholds = { frecuente: 3, antiguo: 10 };

  it('NUEVO por debajo del umbral "frecuente"', () => {
    expect(calculateClientSegment(0, thresholds)).toBe(ClientSegment.NUEVO);
    expect(calculateClientSegment(2, thresholds)).toBe(ClientSegment.NUEVO);
  });

  it('FRECUENTE en el umbral inferior (inclusivo) y por debajo de "antiguo"', () => {
    expect(calculateClientSegment(3, thresholds)).toBe(ClientSegment.FRECUENTE);
    expect(calculateClientSegment(9, thresholds)).toBe(ClientSegment.FRECUENTE);
  });

  it('ANTIGUO en el umbral superior (inclusivo) y por encima', () => {
    expect(calculateClientSegment(10, thresholds)).toBe(ClientSegment.ANTIGUO);
    expect(calculateClientSegment(50, thresholds)).toBe(ClientSegment.ANTIGUO);
  });

  it('umbrales distintos se respetan sin quedar hardcodeados', () => {
    const custom: ClientSegmentThresholds = { frecuente: 1, antiguo: 2 };
    expect(calculateClientSegment(1, custom)).toBe(ClientSegment.FRECUENTE);
    expect(calculateClientSegment(2, custom)).toBe(ClientSegment.ANTIGUO);
  });
});
