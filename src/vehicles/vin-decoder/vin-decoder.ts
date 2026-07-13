export interface VinDecodeResult {
  make?: string;
  model?: string;
  year?: number;
}

export interface VinDecoder {
  decode(vin: string): Promise<VinDecodeResult>;
}

export const VIN_DECODER = Symbol('VIN_DECODER');
