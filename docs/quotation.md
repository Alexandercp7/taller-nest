# Módulo: `quotations`

Presupuesto que se presenta al cliente. Es **propuesta**, no ingreso: finanzas nunca reconoce
dinero desde aquí. Reglas de dominio en [`business-rules.md`](./business-rules.md).

## Entidades y Modelo Prisma

- `Quotation(id, workOrderId, subtotal, taxAmount, total, aplicaIva, discountType, discountValue, clientApprovalStatus, createdAt, updatedAt)`
- `QuotationLine(id, quotationId, lineType {SERVICE|PART}, serviceId?, articleId?, concept, quantity, unitPrice, finalPrice, priceOverrideReason, priceOverrideById?, approvalStatus {PENDING|APPROVED|REJECTED}, rejectionReason?, reQuotedFromLineId?, createdAt, updatedAt)`

Todos los montos numéricos se gestionan con alta precisión en base de datos mediante `Decimal(12,2)` y aritmética de `Prisma.Decimal`.

## Aprobación por línea (decisión clave de dominio)

- El cliente aprueba o rechaza **por línea**. Una aprobación parcial no detiene la OT: permite avanzar a reparación con lo aceptado.
- Las líneas rechazadas se **conservan intactas** (inmutables) junto con su `rejectionReason`, facilitando analítica de pérdidas (`@@index([approvalStatus])`).
- Recotizar = creación de una nueva línea vinculada mediante `reQuotedFromLineId` a la línea original, preservando la trazabilidad histórica ("se ofreció X a $A / se re-ofreció Y a $B").
- `clientApprovalStatus` se resuelve automáticamente:
  - Todas las líneas `APPROVED` → `APROBADA_TOTAL` (avanza OT comercial a `APROBADA_TOTAL`).
  - Mezcla de `APPROVED` y `REJECTED`/`PENDING` → `APROBADA_PARCIAL` (avanza OT comercial a `APROBADA_PARCIAL`).
  - Todas las líneas `REJECTED` → `RECHAZADA`.
  - Sin resolver → `PENDING`.
- Al agregar líneas a una OT `SIN_COTIZAR`, el estado comercial avanza a `COTIZADA`.
- El cierre comercial posterior suma **únicamente** líneas con estado `APPROVED`.

## Motor de Cálculo Centralizado (`domain/quotation-calculator.ts`)

La lógica matemática reside de forma pura en `QuotationCalculator`:
- **Subtotal:** Suma de `(quantity × finalPrice)` para todas las líneas (o líneas `APPROVED` al cerrar).
- **Descuento:** Aplicado sobre el subtotal antes de impuestos:
  - `PERCENT`: `subtotal × (discountValue / 100)`
  - `FIXED`: `min(discountValue, subtotal)`
- **Base imponible:** `subtotal - discountAmount`.
- **IVA (16%):** Si `aplicaIva` es `true`, `iva = base × 0.16`; si es `false`, `iva = 0`.
- **Total:** `base + iva`.

## Override de Precio

Usuarios con permisos suficientes pueden ajustar el `finalPrice` de una línea especificando obligatoriamente un motivo (`priceOverrideReason`), quedando auditado con el ID del usuario (`priceOverrideById`).
El override es específico a la cotización y **no** altera los precios base del catálogo de servicios ni de refacciones.

## Endpoints REST (v1)

Prefijo: `/api/v1/work-orders/:woId/quotation`

| Método | Ruta | Permiso Requerido | Descripción |
|---|---|---|---|
| `GET` | `/` | `QUOTATIONS_READ` | Obtiene la cotización de la orden de trabajo con sus líneas, cálculos e histórico. |
| `POST` | `/lines` | `QUOTATIONS_LINES_ADD` | Agrega una línea (`SERVICE` o `PART`). Resuelve automáticamente el precio unitario del catálogo si no se especifica. |
| `PATCH` | `/lines/:lineId` | `QUOTATIONS_LINES_UPDATE` | Modifica concepto, cantidad o precio unitario de una línea existente y recalcula totales. |
| `DELETE` | `/lines/:lineId` | `QUOTATIONS_LINES_REMOVE` | Elimina una línea de la cotización y recalcula los totales. |
| `POST` | `/lines/:lineId/override-price` | `QUOTATIONS_PRICE_OVERRIDE` | Ajusta el precio unitario final de una línea con auditoría y justificación obligatoria. |
| `POST` | `/approve` | `QUOTATIONS_APPROVE` | Registra la decisión del cliente línea por línea (`APPROVED` o `REJECTED` con motivo) y transiciona el estado comercial de la OT. |
| `PATCH` | `/discount` | `QUOTATIONS_DISCOUNT_APPLY` | Aplica o retira un descuento (porcentual o fijo) y conmuta la aplicación de IVA. |
