import { InvalidCursorException } from '@common/exceptions/domain.exceptions';

export interface KardexCursor {
  createdAt: string;
  id: string;
}

export function encodeKardexCursor(cursor: KardexCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeKardexCursor(cursor: string): KardexCursor {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as KardexCursor).createdAt === 'string' &&
      typeof (parsed as KardexCursor).id === 'string'
    ) {
      return parsed as KardexCursor;
    }
    throw new Error('Forma de cursor inválida.');
  } catch {
    throw new InvalidCursorException();
  }
}
