# Convenciones de API

Arquitectura **pública** (el contrato con el frontend), distinta de la interna.

---

## Estilo y versionado

- **REST** sobre JSON. Prefijo de versión en la ruta: `/api/v1/...`. Un cambio incompatible
  abre `/api/v2`; los aditivos (campos nuevos opcionales) no cambian versión.
- Recursos en plural: `/api/v1/work-orders`, `/api/v1/work-orders/:id/payments`.
- Verbos HTTP: `GET` (leer), `POST` (crear/acción), `PATCH` (actualización parcial),
  `PUT` (reemplazo total, p. ej. set de permisos), `DELETE` (soft-delete).
- Acciones que no son CRUD van como sub-recurso POST: `POST /work-orders/:id/commercial-close`,
  `POST /work-orders/:id/status`.

## Formato de error (uniforme)

Un filtro global mapea las excepciones de dominio a este cuerpo:

```json
{
  "statusCode": 409,
  "error": "PAYMENT_EXCEEDS_BALANCE",
  "message": "El pago (1500.00) excede el saldo de la cuenta (1200.00).",
  "path": "/api/v1/work-orders/OT-0042/payments",
  "timestamp": "2026-01-15T10:30:00Z"
}
```

- `error` es un **código estable** (screaming snake), apto para que el frontend haga branching.
- `message` es legible para humanos; no expone stack traces ni internals.
- Códigos HTTP: 400 validación/transición inválida · 401 no autenticado · 403 sin permiso ·
  404 no existe · 409 conflicto de negocio (saldo, stock, duplicado) · 422 estado no permite la
  acción. Tabla completa en [`code-conventions.md`](./code-conventions.md).

## Paginación (listados)

Paginación por **cursor** para listados grandes (OTs, movimientos, auditoría); offset solo para
catálogos pequeños. Respuesta envuelta:

```json
{
  "data": [ /* ... */ ],
  "pageInfo": { "nextCursor": "eyJpZCI6...", "hasNextPage": true, "limit": 20 }
}
```

- `limit` por defecto 20, máximo 100.
- El cursor codifica el último `(createdAt, id)` — estable ante inserciones. Ver
  [`performance.md`](./performance.md).

## Filtros, orden y búsqueda

- Filtros como query params tipados: `GET /work-orders?operationalStatus=EN_REPARACION&serviceAdvisorId=...&estaRetrasada=true`.
- Rango de fechas: `?from=2026-01-01&to=2026-01-31` (reportes, movimientos).
- Orden: `?sort=createdAt:desc` (lista blanca de campos ordenables por recurso).
- Inactivos ocultos por defecto en recursos con soft-delete: `?includeInactive=true` para verlos.
- Búsqueda de texto acotada por recurso (p. ej. cliente por nombre/teléfono); no un `q` global.

## Otras convenciones

- **Idempotencia** en operaciones sensibles (pagos): header `Idempotency-Key`; reintento de red
  no duplica el cobro.
- **Autenticación:** `Authorization: Bearer <access>`; refresh por endpoint dedicado (ver
  [`auth.md`](./auth.md)).
- **Fechas** en ISO 8601 UTC. **Montos** en el JSON como string decimal (`"1200.00"`) para no
  perder precisión en el cliente.
- **OpenAPI/Swagger** generado desde los DTOs; es la fuente del contrato.
- **CORS** restringido al origen del frontend; **rate limiting** (`@nestjs/throttler`) en login,
  refresh y todo el portal público.
