export class LastAdminException extends Error {
  readonly code = 'LAST_ADMIN_CANNOT_BE_DEACTIVATED';
  readonly statusCode = 409;
  constructor() {
    super('No se puede desactivar al último administrador activo.');
  }
}

export class InvalidCredentialsException extends Error {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;
  constructor() {
    super('Credenciales inválidas.');
  }
}

export class TokenFamilyRevokedException extends Error {
  readonly code = 'TOKEN_FAMILY_REVOKED';
  readonly statusCode = 401;
  constructor() {
    super('Sesión revocada por uso sospechoso del token.');
  }
}

export class ForbiddenActionException extends Error {
  readonly code = 'FORBIDDEN_ACTION';
  readonly statusCode = 403;
  constructor(message = 'Acción no permitida.') {
    super(message);
  }
}

export class UserInactiveException extends Error {
  readonly code = 'USER_INACTIVE';
  readonly statusCode = 401;
  constructor() {
    super('Usuario inactivo.');
  }
}

export class ClientHasActiveOrdersException extends Error {
  readonly code = 'CLIENT_HAS_ACTIVE_ORDERS';
  readonly statusCode = 409;
  constructor() {
    super('El cliente tiene órdenes de trabajo activas.');
  }
}

export class InvalidClientIdentityException extends Error {
  readonly code = 'INVALID_CLIENT_IDENTITY';
  readonly statusCode = 400;
  constructor(
    message = 'Identidad de cliente inválida para el tipo indicado.',
  ) {
    super(message);
  }
}

export class InsufficientStockException extends Error {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly statusCode = 409;
  constructor() {
    super('Stock insuficiente para la cantidad solicitada.');
  }
}

export class CustodyItemAlreadyReturnedException extends Error {
  readonly code = 'CUSTODY_ITEM_ALREADY_RETURNED';
  readonly statusCode = 409;
  constructor() {
    super('La pieza en custodia ya fue devuelta.');
  }
}

export class InvalidQuantityException extends Error {
  readonly code = 'INVALID_QUANTITY';
  readonly statusCode = 400;
  constructor(message = 'La cantidad debe ser mayor a cero.') {
    super(message);
  }
}
