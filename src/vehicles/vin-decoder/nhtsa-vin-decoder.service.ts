import { Injectable, Logger } from '@nestjs/common';
import { VinDecodeResult, VinDecoder } from './vin-decoder';

interface NhtsaResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
}

interface NhtsaResponse {
  Results?: NhtsaResult[];
}

/**
 * Proveedor gratuito, sin API key: National Highway Traffic Safety
 * Administration (EE.UU.). Falla en silencio (devuelve {}) porque el
 * autocompletado es una ayuda, no un bloqueo — el usuario siempre puede
 * capturar los campos a mano.
 */
@Injectable()
export class NhtsaVinDecoder implements VinDecoder {
  private readonly logger = new Logger(NhtsaVinDecoder.name);

  async decode(vin: string): Promise<VinDecodeResult> {
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${encodeURIComponent(vin)}?format=json`,
      );
      if (!response.ok) return {};

      const body = (await response.json()) as NhtsaResponse;
      const result = body.Results?.[0];
      if (!result) return {};

      const year = result.ModelYear ? Number(result.ModelYear) : undefined;
      return {
        make: result.Make || undefined,
        model: result.Model || undefined,
        year: year !== undefined && !Number.isNaN(year) ? year : undefined,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo decodificar el VIN ${vin}: ${(error as Error).message}`,
      );
      return {};
    }
  }
}
