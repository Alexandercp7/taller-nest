# Módulo: `services`

Catálogo maestro de mano de obra, servicios mecánicos, maquinados/torno y tarifas parametrizadas por tipo de vehículo.

---

## Dominio y Propósito

El módulo `services` administra todo el trabajo técnico que el taller ejecuta sobre los vehículos. Se unifica en este módulo:
1. **Mano de obra y servicios mecánicos:** Afinaciones, frenos, suspensión, motor, transmisión, fallas eléctricas, etc.
2. **Servicios de maquinado y torno:** Rectificación de discos, rectificación de tambores, volantes motrices y barrenado (anteriormente modelado como `LatheService`, ahora integrado bajo la categoría `TORNO_Y_MAQUINADO`).
3. **Tiempos estándar (`estimatedMinutes`):** Minutos presupuestados para la labor técnica. Permiten estimar la fecha de entrega de la Orden de Trabajo y calcular retrasos (`estaRetrasada`).

---

## Entidades y Modelo de Datos

- **`Service`**:
  - `id`: CUID.
  - `workshopId`: Taller propietario.
  - `code`: Código corto opcional único por taller (ej. `SRV-FREN-01`, `TOR-DISC-01`).
  - `concept`: Nombre descriptivo de la labor (ej. "Cambio de balatas delanteras").
  - `category`: `ServiceCategory` (`AFINACION_Y_MANTENIMIENTO`, `FRENOS_Y_SUSPENSION`, `MECANICA_GENERAL`, `MECANICA_RAPIDA`, `ELECTRICO_Y_DIAGNOSTICO`, `TORNO_Y_MAQUINADO`).
  - `system`: Sistema automotriz (ej. "Frenos", "Motor", "Suspensión").
  - `family`: Subagrupador opcional (ej. "Discos", "Inyección").
  - `estimatedMinutes`: Tiempo estándar presupuestado en minutos.
  - `basePrice`: Tarifa fija o universal (`Decimal(12, 2)`).
  - `costPrice`: Costo interno de referencia o costo de maquila externa (`Decimal(12, 2)`).
  - `notes`: Instrucciones o notas para el técnico o asesor.
  - `isActive`: Flag para soft-delete.

- **`ServicePrice`**:
  - Matriz de tarifas diferenciadas según el tipo de vehículo (`VehicleType`: `AUTO`, `CAMIONETA`, `CAMION`).
  - `serviceId`: FK a `Service`.
  - `vehicleType`: `VehicleType`.
  - `price`: Monto específico (`Decimal(12, 2)`).
  - Unicidad: `@@unique([serviceId, vehicleType])`.

---

## Regla de Resolución de Precios (`service-price.resolver.ts`)

Cuando una cotización o el cliente consulta el precio de un servicio para un vehículo específico:
1. **Prioridad 1:** Si el vehículo tiene un tipo (`AUTO`, `CAMIONETA`, `CAMION`) y existe una fila coincidente en `ServicePrice`, se toma ese precio.
2. **Prioridad 2 (Fallback):** Si no existe tarifa diferenciada en `ServicePrice`, se toma el precio universal `basePrice` de `Service`.
3. Si ninguno existe, se considera servicio a cotizar bajo diagnóstico / revisión previa.

---

## Endpoints (v1)

Prefijo global: `/api/v1`

- `POST /api/v1/services` — Crear servicio con precios opcionales por tipo de vehículo (`service:write`).
- `GET /api/v1/services` — Listar servicios paginados `{ data, total }` con filtros (`category`, `system`, `search`, `vehicleType` para resolver precio) (`service:read`).
- `GET /api/v1/services/:id` — Detalle del servicio con resolución opcional por `?vehicleType` (`service:read`).
- `PATCH /api/v1/services/:id` — Actualizar información general o precios (`service:write`).
- `PUT /api/v1/services/:id/prices` — Reemplazar la matriz de tarifas por tipo de vehículo (`service:write`).
- `DELETE /api/v1/services/:id` — Desactivar servicio (`isActive = false`, soft-delete) (`service:write`).

---

## Auditoría y Trazabilidad

Toda creación, actualización, reemplazo de tarifas y desactivación registra un evento en `AuditLog` dentro de la transacción:
- `SERVICE_CREATED`
- `SERVICE_UPDATED`
- `SERVICE_PRICES_UPDATED`
- `SERVICE_DEACTIVATED`
