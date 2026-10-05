# Módulo: `finance` (+ payments)

Dueño de "cómo se cobra": CxC, pagos, caja, comisiones, reportes y CxP. Recibe el total
congelado del cierre; **la cotización nunca genera ingreso**. Flujos en [`diagrams.md`](./diagrams.md).

## Entidades

- `AccountReceivable(workOrderId unique, originalAmount, paidAmount, balance, status {OPEN|PARTIAL|PAID|CANCELLED})`
- `Payment(workOrderId, type {ADVANCE|FINAL_SETTLEMENT}, amount, terminalCommission, netAmount, cashMovementId)`
- `CashMovement(type {INCOME|EXPENSE}, amount, referenceType, referenceId)`
- `AccountPayable(supplierId, ...)` (CxP a proveedores)

## Invariantes

| Regla | Dónde |
|---|---|
| CxC nace solo al confirmar cierre | orquestador `commercial-close` (misma tx) |
| No duplicar CxC en recierre | `upsert` por `workOrderId` (CC-05) |
| Anticipos ≥ total → saldo 0, `PAID` | `upsertReceivableFromClose` |
| Pago ≤ saldo | `balance.validator.ts` (dominio) + `PaymentsService` en tx |
| Pago > 0 | validación de dominio |
| Cada pago genera `CashMovement` INCOME | `PaymentsService → FinanceService` (misma tx) |
| IVA nunca es ganancia | agregado por columna separada en reportes |

## Dinero

`netAmount = amount − terminalCommission`; contra el saldo se valida `amount` bruto. Todo
`Decimal(12,2)`. Fórmulas de IVA/descuento en [`business-rules.md`](./business-rules.md).

## Reportes

Por **agregación SQL**, no cargando entidades (ver [`performance.md`](./performance.md)). Separan
venta bruta / descuento / IVA / comisión / neto. Vencimientos (CxC/CxP/agenda) marcados por cron
diario (`@nestjs/schedule`).

## Endpoints (v1)

### Cierre Comercial (`commercial-close`)
- `POST /api/v1/work-orders/:woId/commercial-close` (requiere `work-orders:write` o `finance:write`):
  Congela las líneas de cotización aprobadas, calcula el total congelado, resuelve `billingStatus` y genera/actualiza la CxC deduciendo anticipos.
- `GET /api/v1/work-orders/:woId/commercial-close`: Consulta el detalle del cierre comercial de la OT.

### Pagos (`payments`)
- `POST /api/v1/work-orders/:woId/payments` (requiere `finance:write`):
  Registra un anticipo (`ADVANCE`) o liquidación (`FINAL_SETTLEMENT`), valida saldo disponible vía `BalanceValidator`, genera `CashMovement` (INCOME), actualiza saldo y estado de CxC (`OPEN`/`PARTIAL`/`PAID`), actualiza estatus comercial de la OT (`COBRADA_PARCIAL`/`COBRADA_TOTAL`) y recalcula etiqueta del cliente.
- `GET /api/v1/work-orders/:woId/payments/summary`: Resumen de pagos, anticipos acumulados, saldo pendiente y comisiones de terminal.

### Finanzas (`finance`)
- `GET /api/v1/finance/receivables`: Listado paginado de CxC con filtros por estado (`OPEN`, `PARTIAL`, `PAID`, `CANCELLED`) y `clientId`.
- `POST /api/v1/finance/cash-movements` (requiere `finance:write`): Registra movimientos de caja manuales (`INCOME` / `EXPENSE`).
- `GET /api/v1/finance/cash-movements`: Listado de movimientos de caja con filtros por fechas, tipo y origen.
- `GET /api/v1/finance/report?from&to`: Reporte financiero agregado (bruto, descuento, IVA, comisiones, neto).
