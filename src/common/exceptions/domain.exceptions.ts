export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}

export class LastAdminException extends DomainException {
  readonly code = 'LAST_ADMIN_CANNOT_BE_DEACTIVATED';
  readonly statusCode = 409;
  constructor() {
    super('No se puede desactivar al último administrador activo.');
  }
}

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;
  constructor() {
    super('Credenciales inválidas.');
  }
}

export class TokenFamilyRevokedException extends DomainException {
  readonly code = 'TOKEN_FAMILY_REVOKED';
  readonly statusCode = 401;
  constructor() {
    super('Sesión revocada por uso sospechoso del token.');
  }
}

export class ForbiddenActionException extends DomainException {
  readonly code = 'FORBIDDEN_ACTION';
  readonly statusCode = 403;
  constructor(message = 'Acción no permitida.') {
    super(message);
  }
}

export class UserInactiveException extends DomainException {
  readonly code = 'USER_INACTIVE';
  readonly statusCode = 401;
  constructor() {
    super('Usuario inactivo.');
  }
}

export class ClientHasActiveOrdersException extends DomainException {
  readonly code = 'CLIENT_HAS_ACTIVE_ORDERS';
  readonly statusCode = 409;
  constructor() {
    super('El cliente tiene órdenes de trabajo activas.');
  }
}

export class InvalidClientIdentityException extends DomainException {
  readonly code = 'INVALID_CLIENT_IDENTITY';
  readonly statusCode = 400;
  constructor(
    message = 'Identidad de cliente inválida para el tipo indicado.',
  ) {
    super(message);
  }
}

export class InsufficientStockException extends DomainException {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly statusCode = 409;
  constructor() {
    super('Stock insuficiente para la cantidad solicitada.');
  }
}

export class CustodyItemAlreadyReturnedException extends DomainException {
  readonly code = 'CUSTODY_ITEM_ALREADY_RETURNED';
  readonly statusCode = 409;
  constructor() {
    super('La pieza en custodia ya fue devuelta.');
  }
}

export class InvalidQuantityException extends DomainException {
  readonly code = 'INVALID_QUANTITY';
  readonly statusCode = 400;
  constructor(message = 'La cantidad debe ser mayor a cero.') {
    super(message);
  }
}

export class DuplicateVehicleTypePriceException extends DomainException {
  readonly code = 'DUPLICATE_VEHICLE_TYPE_PRICE';
  readonly statusCode = 400;
  constructor() {
    super(
      'No se puede repetir el mismo vehicleType en la lista de precios de un servicio.',
    );
  }
}

export class SalePriceRequiredException extends DomainException {
  readonly code = 'SALE_PRICE_REQUIRED';
  readonly statusCode = 400;
  constructor() {
    super('Consumibles y refacciones en venta requieren precio de venta.');
  }
}

export class SalePriceNotAllowedException extends DomainException {
  readonly code = 'SALE_PRICE_NOT_ALLOWED';
  readonly statusCode = 400;
  constructor() {
    super('Herramientas y equipos no llevan precio de venta.');
  }
}

export class InvalidCursorException extends DomainException {
  readonly code = 'INVALID_CURSOR';
  readonly statusCode = 400;
  constructor() {
    super('Cursor inválido.');
  }
}
