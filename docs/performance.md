# Performance

No es urgente para el primer cliente, pero estas decisiones son baratas ahora y caras después.

---

## Índices esperados

Definirlos en `schema.prisma` desde la primera migración:

| Tabla | Índice | Motivo |
|---|---|---|
| `WorkOrder` | `code` unique | Búsqueda por folio (portal e interno). |
| `WorkOrder` | `portalToken` unique | Acceso del portal. |
| `WorkOrder` | `(operationalStatus)`, `(serviceAdvisorId)`, `(clientId)` | Listados filtrados del tablero. |
| `WorkOrder` | `(createdAt, id)` | Paginación por cursor. |
| `AuditLog` | `(entityType, entityId, createdAt)` | Timeline de la OT (tabla polimórfica **sin FK**: este índice es obligatorio). |
| `QuotationLine` | `(quotationId)`, `(approvalStatus)` | Ejecución + analítica de rechazos. |
| `AccountReceivable` | `workOrderId` unique, `(status)` | Upsert del cierre y bandejas de cobro. |
| `CashMovement` | `(type, createdAt)`, `(referenceType, referenceId)` | Reportes y trazabilidad. |
| `StockMovement` | `(articleId, createdAt)` | Kardex por artículo. |
| `Article` | índice parcial `WHERE stock < minStock` | Alerta de stock bajo eficiente. |
| `Article` | `(workshopId, type)`, `(supplierId)`, `(oemNumber)` | Búsqueda y filtrado de refacciones/consumibles. |
| `Tool` | `(workshopId, status)`, `(assignedToUserId)` | Control y disponibilidad de herramienta por técnico. |
| `Client` | `(workshopId, segment)`, `(workshopId, hasDebt)`, `(phone)` | Segmentación, análisis de cartera y búsqueda pública. |
| `Service` | `(workshopId, code)` unique, `(workshopId, category)`, `(concept)` | Catálogo de mano de obra y búsqueda rápida en cotizador. |
| `ServicePrice` | `(serviceId, vehicleType)` unique | Resolución de tarifas de servicio por vehículo. |

Regla: cada campo que aparezca en un `where`/`orderBy` de un listado frecuente necesita índice.

---

## N+1 — la trampa más común con Prisma

- Usar `include`/`select` para traer relaciones en **una** consulta, no en bucle.
  - **Mal:** cargar N OTs y luego `findUnique(client)` por cada una.
  - **Bien:** `findMany({ include: { client: true, vehicle: true } })`.
- Reconstruir el agregado OT (con `quotation.lines`, `execution`, `closure`) en una sola carga
  con `include` anidado.
- En bucles de escritura (asignar N refacciones), agrupar en `createMany`/`updateMany` cuando el
  orden no importe; usar `FOR UPDATE` solo donde la invariante lo exige (stock).
- Vigilar los `map(async …)` que disparan una query por elemento; preferir consultas en lote.

---

## Paginación

- **Cursor** (keyset) para listados grandes y de crecimiento continuo: OTs, movimientos de caja,
  `StockMovement`, `AuditLog`. Cursor sobre `(createdAt, id)`; evita el costo creciente de
  `OFFSET` en páginas profundas.
- **Offset** aceptable solo en catálogos acotados (usuarios, proveedores, lista de precios).
- Límite por defecto 20, tope 100 (ver [`api-conventions.md`](./api-conventions.md)).

---

## Consultas grandes y reportes

- Los **reportes financieros** (ventas, IVA, comisiones, neto por período) no se calculan
  cargando entidades en memoria: se resuelven con **agregaciones en SQL** (`groupBy`, `sum`) o
  vistas. El IVA se agrega en su propia columna y **nunca** se suma al neto.
- Para períodos largos, acotar por rango de fechas indexado y paginar/streamear resultados.
- Si un reporte se vuelve pesado, materializar (tabla resumen diaria vía el cron ya existente)
  antes de introducir infraestructura nueva.

---

## Read models (lecturas desacopladas de la escritura)

- **Portal público:** proyección de solo lectura endurecida (`PublicWorkOrderView`), que trae
  solo campos públicos y filtra notas internas en la propia consulta. No reusar los includes
  internos de la OT.
- **Dashboard/tablero:** consultas de lectura optimizadas por estado; no recomponer el agregado
  completo para pintar una lista.

---

## Cuándo NO optimizar todavía

- Cachés distribuidas, colas, réplicas de lectura, materialización agresiva: **no en v1**.
  Primero medir con datos reales del taller. La revalidación de `isActive` por request, por
  ejemplo, es una query trivial a este volumen; no cachear prematuramente.
