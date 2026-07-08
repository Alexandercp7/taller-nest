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

`POST /work-orders/:woId/payments` (idempotente) · `GET /work-orders/:woId/payments/summary` ·
`GET /finance/receivables` · `POST /finance/cash-movements` · `GET /finance/report?from&to`.
