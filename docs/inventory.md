# Módulo: `inventory`

Control de almacén, refacciones consumibles/vendibles, activos/herramientas de taller y pertenencias en custodia.

---

## Separación de dominios: Refacciones vs Herramientas

Para evitar contaminación de datos y simplificar el módulo de cotizaciones (`quotations`):
1. **Refacciones y Consumibles (`Article`):** Todo material que se compra, almacena, consume o vende al cliente en las OTs. Tienen Kardex de existencias y costos.
2. **Herramientas y Equipos (`Tool`):** Activos fijos propios del taller (escáneres, pistolas de impacto, torquímetros, elevadores). No se venden al cliente ni se consumen en OTs; se asignan a técnicos y se gestionan por estado físico y mantenimiento.
3. **Piezas en Custodia (`CustodyItem`):** Artículos personales o accesorios dejados por el cliente en el vehículo al momento de la recepción.

---

## Entidades

- `Article(workshopId, supplierId?, sku?, oemNumber?, type {PARTE_EN_VENTA|CONSUMIBLE}, name, brand?, location?, isSpecialOrder, purchasePrice, salePrice, stock, minStock, isActive)`
- `StockMovement(articleId, workOrderId?, type {ENTRY|EXIT|ADJUSTMENT}, qty, before, after, unitCost?, reason, actorId)`
- `Tool(workshopId, serialNumber?, name, brand?, condition {NUEVO|BUENO|REGULAR|DANADO}, status {DISPONIBLE|EN_USO|EN_MANTENIMIENTO|DADO_DE_BAJA}, purchasePrice?, assignedToUserId?, lastMaintenanceAt?, isActive)`
- `CustodyItem(workshopId, clientId, vehicleId?, description, workOrderCode?, responsibleUserId?, isReturned, returnedAt?)`

---

## Invariante crítica: stock nunca negativo

Protección en capas dentro de la transacción de asignación/movimiento:
1. **Dominio:** `stock.validator.ts` rechaza `qty > disponible` en salidas (`EXIT`) y exige `qty >= 0`.
2. **Bloqueo pesimista:** Bloqueo concurrente sobre la fila del artículo al descontar en la ejecución de la OT.
3. **Red de BD:** Constraint de integridad `CHECK (stock >= 0)`.

Como el descuento se origina en la ejecución real de la OT ([`work-orders.md`](./work-orders.md)), se ejecuta vía el puerto de inventory dentro de la misma transacción orquestada. Ver la regla de oro en [`code-conventions.md`](./code-conventions.md).

---

## Kardex y Valuación Contable

Todo cambio de existencias deja registro en `StockMovement` con `before`/`after` y `unitCost` (costo de adquisición). Esto permite a Finanzas calcular con precisión el costo de lo vendido (COGS) y el margen real de la orden.

---

## Alerta de stock bajo

Endpoint `GET /api/v1/inventory/low-stock` para consultar artículos con `stock < minStock`. Consultas indexadas por taller y estatus activo.

---

## Endpoints (v1)

Prefijo global: `/api/v1`

### Refacciones y Consumibles (`/inventory/articles`)
- `POST /api/v1/inventory/articles` — Crear artículo / refacción.
- `GET /api/v1/inventory/articles` — Lista paginada `{ data, total }` con filtros (tipo, búsqueda por nombre, SKU, marca, OEM).
- `GET /api/v1/inventory/articles/:id` — Detalle del artículo.
- `PATCH /api/v1/inventory/articles/:id` — Actualizar datos del artículo.
- `POST /api/v1/inventory/articles/:id/photo` — Subir fotografía a R2.
- `DELETE /api/v1/inventory/articles/:id` — Soft-delete (`isActive = false`).
- `GET /api/v1/inventory/low-stock` — Artículos por debajo del stock mínimo.
- `GET /api/v1/inventory/articles/:id/kardex` — Paginación por cursor del historial de movimientos.

### Movimientos de Almacén (`/inventory/movements`)
- `POST /api/v1/inventory/movements` — Registrar movimiento (`ENTRY`, `EXIT`, `ADJUSTMENT`) con `unitCost`.

### Herramientas y Equipos (`/inventory/tools`)
- `POST /api/v1/inventory/tools` — Registrar activo / herramienta.
- `GET /api/v1/inventory/tools` — Lista paginada `{ data, total }` (filtros: condición, estatus, técnico asignado).
- `GET /api/v1/inventory/tools/:id` — Detalle de la herramienta.
- `PATCH /api/v1/inventory/tools/:id` — Actualizar datos, estatus o reasignación a técnico.
- `POST /api/v1/inventory/tools/:id/photo` — Subir foto del equipo a R2.
- `DELETE /api/v1/inventory/tools/:id` — Desactivar herramienta (soft-delete).

### Piezas en Custodia (`/inventory/custody`)
- `POST /api/v1/inventory/custody` — Registrar pertenencia en custodia.
- `GET /api/v1/inventory/custody` — Listar piezas en custodia (filtro por cliente, estatus devuelto).
- `GET /api/v1/inventory/custody/:id` — Detalle de la pieza en custodia.
- `POST /api/v1/inventory/custody/:id/photo` — Foto de la pertenencia resguardada.
- `POST /api/v1/inventory/custody/:id/return` — Marcar como devuelta al cliente.
