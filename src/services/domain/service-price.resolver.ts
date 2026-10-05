import { VehicleType } from '@prisma/client';

export interface ServicePriceCandidate {
  vehicleType: VehicleType;
  price: string | number | { toString(): string };
}

export interface ServicePricingSource {
  basePrice?: string | number | { toString(): string } | null;
  prices?: ServicePriceCandidate[];
}

/**
 * Resuelve el precio aplicable para un servicio según el tipo de vehículo.
 * Regla de negocio:
 * 1. Si se especifica vehicleType y existe un precio en la matriz de precios, se toma ese precio.
 * 2. Si no existe en la matriz o no hay coincidencia, se toma el precio base universal (`basePrice`).
 * 3. Si ninguno existe, retorna null.
 */
export function resolveServicePrice(
  source: ServicePricingSource,
  vehicleType?: VehicleType,
): string | null {
  if (vehicleType && source.prices && source.prices.length > 0) {
    const match = source.prices.find((p) => p.vehicleType === vehicleType);
    if (match) {
      return match.price.toString();
    }
  }

  if (source.basePrice !== undefined && source.basePrice !== null) {
    return source.basePrice.toString();
  }

  return null;
}
