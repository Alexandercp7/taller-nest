# Módulo: `work-orders` (núcleo)

Aggregate root del sistema. Coordina las tres máquinas de estado y es dueño de "qué se cobra"
(cotización → cierre). Ver el agregado y los flujos en [`diagrams.md`](./diagrams.md); las reglas
de dominio en [`business-rules.md`](./business-rules.md).

## Entidades y Modelo Prisma

- `WorkOrder(id, code, clientId, vehicleId, serviceAdvisorId, operationalStatus, commercialStatus, billingStatus, fuelLevel, initialMileage, entryDate, estimatedDeliveryDate, realDeliveryDate, cancelReason, cancellationDate, estaRetrasada, portalToken, workshopId, createdAt, updatedAt)`
- `OtReceptionChecklist(id, workOrderId, hasKeys, hasDocuments, hasSpareTire, hasJack, hasFireExtinguisher, otherItems, notes, signatureUrl, signedBy, signedAt)`
- `OtNote(id, workOrderId, authorId, content, isClientVisible, createdAt)`
- `OtPhoto(id, workOrderId, uploadedById, url, filename, mimeType, sizeBytes, category, caption, createdAt)`
- Dentro del agregado: `Quotation` (ver [`quotation.md`](./quotation.md)), `Execution`,
  `CommercialClose`. Fuera (por `workOrderId`): CxC/pagos (finance), `Invoice` (billing), stock (inventory).

## Máquinas de estado (en `domain/`, puras)

Toda transición pasa por `WorkOrderOperationalStateMachine`, que rechaza las inválidas con `BadRequestException`.

- **Operativa (`OperationalStatus` - 11 estados):**
  ```
  RECIBIDA
     ├──> EN_DIAGNOSTICO ──> EN_ESPERA_COTIZACION ⇄ EN_ESPERA_APROBACION ──> EN_REPARACION
     │                                                                           │
     │    ┌───────────────────────── REPROCESO QC ───────────────────────────────┘
     │    ▼
     │  CONTROL_CALIDAD ──> LISTA_PARA_ENTREGA ──> ENTREGADA ──> CERRADA
     │                                                │
     │                                                └──> EN_GARANTIA ──> EN_REPARACION
     │
     └──> CANCELADA (Permitida desde RECIBIDA, EN_DIAGNOSTICO, EN_ESPERA_COTIZACION, EN_ESPERA_APROBACION, EN_REPARACION, CONTROL_CALIDAD)
  ```
  - Sin salto directo diagnóstico → reparación.
  - Recotizar reingresa por `EN_ESPERA_COTIZACION`.
  - Aprobación parcial o total avanza a `EN_REPARACION`.
  - Rechazo en QC regresa a `EN_REPARACION`.
  - Reingreso de garantía regresa de `EN_GARANTIA` a `EN_REPARACION`.
  - Estados terminales `CERRADA` y `CANCELADA` son inmutables.

- **Comercial (`CommercialStatus` - 8 estados):**
  `SIN_COTIZAR` → `COTIZADA` → `{APROBADA_PARCIAL | APROBADA_TOTAL}` → `EN_EJECUCION` → `CIERRE_PENDIENTE` → `{COBRADA_PARCIAL → COBRADA_TOTAL}`.

- **Facturación (`BillingStatus` - 5 estados):**
  `NO_REQUERIDA`, `PENDIENTE_DATOS`, `LISTA_PARA_FACTURAR`, `FACTURADA`, `CANCELADA`.

`estaRetrasada` es un flag booleano paralelo, no un estado de la máquina.

## Reglas y su imposición

| Regla | Dónde |
|---|---|
| Transición operativa válida | `work-order-operational-state-machine.ts` (dominio puro) |
| Código `OT-0001` único con reintentos | `work-order-code.generator.ts` + `WorkOrdersService.create` |
| `portalToken` UUID v4 autogenerado | `WorkOrdersService.create` |
| Creación de Checklist y Cotización inicial vacía | `WorkOrdersService.create` (atómico en transacción) |
| Vehículo pertenece al cliente especificado | `WorkOrdersService.create` (validación de integridad) |
| Borrado solo en estado `RECIBIDA` o `CANCELADA` | `WorkOrdersService.remove` |
| Subida de fotos con Cloudflare R2 / S3 | `WorkOrdersService.addPhoto` (Sharp WebP + almacenamiento distribuido) |

## Endpoints REST (v1)

Prefijo: `/api/v1/work-orders`

| Método | Ruta | Permiso Requerido | Descripción |
|---|---|---|---|
| `POST` | `/` | `WORK_ORDERS_CREATE` | Registra una nueva OT, genera código secuencial (`OT-xxxx`), checklist inicial y cotización asociada. |
| `GET` | `/` | `WORK_ORDERS_READ` | Lista órdenes de trabajo paginadas con filtros (`status`, `serviceAdvisorId`, `clientId`, `vehicleId`, `estaRetrasada`, `search`). |
| `GET` | `/:id` | `WORK_ORDERS_READ` | Obtiene el detalle completo de la OT (vehículo, cliente, asesor, checklist, notas, fotos, cotización). |
| `PATCH` | `/:id` | `WORK_ORDERS_UPDATE` | Actualiza metadatos de la orden (asesor, fechas estimadas, kilometraje, combustible). |
| `POST` | `/:id/status` | `WORK_ORDERS_STATUS_CHANGE` | Aplica una transición en la máquina de estados operativos. |
| `PATCH` | `/:id/delayed` | `WORK_ORDERS_UPDATE` | Alterna o establece explícitamente el indicador `estaRetrasada`. |
| `POST` | `/:id/notes` | `WORK_ORDERS_NOTES_CREATE` | Agrega una nota interna o visible al cliente (`isClientVisible`). |
| `POST` | `/:id/photos` | `WORK_ORDERS_PHOTOS_UPLOAD` | Sube fotografía clasificada (`RECEPCION`, `DIAGNOSTICO`, `PROCESO`, `CONTROL_CALIDAD`, `ENTREGA`, `OTRO`). |
| `DELETE` | `/:id` | `WORK_ORDERS_DELETE` | Elimina la orden de trabajo (solo permitido en `RECIBIDA` o `CANCELADA`). |
