import { VehicleType } from '@prisma/client';
import { resolveServicePrice } from './service-price.resolver';

describe('resolveServicePrice', () => {
  it('debe retornar el precio específico del tipo de vehículo si existe en la matriz', () => {
    const source = {
      basePrice: '350.00',
      prices: [
        { vehicleType: VehicleType.AUTO, price: '400.00' },
        { vehicleType: VehicleType.CAMIONETA, price: '550.00' },
        { vehicleType: VehicleType.CAMION, price: '750.00' },
      ],
    };

    expect(resolveServicePrice(source, VehicleType.CAMIONETA)).toBe('550.00');
    expect(resolveServicePrice(source, VehicleType.AUTO)).toBe('400.00');
    expect(resolveServicePrice(source, VehicleType.CAMION)).toBe('750.00');
  });

  it('debe retornar basePrice si el tipo de vehículo no está en la matriz', () => {
    const source = {
      basePrice: '300.00',
      prices: [{ vehicleType: VehicleType.AUTO, price: '400.00' }],
    };

    expect(resolveServicePrice(source, VehicleType.CAMIONETA)).toBe('300.00');
  });

  it('debe retornar basePrice si no se proporciona vehicleType', () => {
    const source = {
      basePrice: '250.00',
      prices: [{ vehicleType: VehicleType.AUTO, price: '400.00' }],
    };

    expect(resolveServicePrice(source)).toBe('250.00');
  });

  it('debe retornar null si no hay precio de vehículo ni basePrice', () => {
    const source = {
      basePrice: null,
      prices: [],
    };

    expect(resolveServicePrice(source, VehicleType.AUTO)).toBeNull();
  });
});
