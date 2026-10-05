# Reglas de Negocio (dominio)

> Estas son reglas de **dominio**, no de arquitectura. Se separan a propósito: cambian por
> decisión del taller, no por decisión técnica. Cada regla indica dónde se impone en el código.

---

## Dinero — IVA, descuentos, comisiones

- **IVA (16%):** por orden, opcional (`aplicaIva`). `taxAmount = aplicaIva ? subtotal × 0.16 : 0`.
  Se guarda **separado** de subtotal y total; **nunca** entra al ingreso neto de los reportes.
- **Descuento:** `PERCENT` (`subtotal × v/100`) o `FIXED` (`v`). Se aplica sobre el subtotal
  **antes** del IVA.
- **Comisión de terminal:** `netAmount = amount − terminalCommission`. Contra el saldo se valida
  el `amount` **bruto**, no el neto.
- Todo monto es `Decimal(12,2)`; fórmulas centralizadas en `quotations/domain/quotation-calculator.ts`.

---

## Cotización — aprobación por línea

- Cada línea tiene `approvalStatus ∈ {PENDING, APPROVED, REJECTED}`.
- El cliente aprueba/rechaza **por línea**. Aprobación parcial **no detiene** la OT: avanza a
  reparación con lo aprobado.
- Las líneas **rechazadas se conservan** (inmutables) con `rejectionReason` → analítica de qué se
  rechaza y por qué.
- **Recotizar** = crear línea nueva con `reQuotedFromLineId` a la original (histórico completo).
- `Quotation.clientApprovalStatus` se deriva: todas aprobadas → total; mezcla → parcial; todas
  rechazadas → rechazada.
- El **cierre suma solo líneas APPROVED y ejecutadas**; las REJECTED nunca tocan finanzas.
- **Override de precio:** ADMIN/DIRECTOR/ASESOR pueden ajustar el precio de una línea con motivo;
  el Técnico solo sugiere vía nota. Se audita (before/after + motivo) y **no** altera el catálogo.

---

## Cierre comercial

- Solo ADMIN/DIRECTOR/ASESOR confirman (no Técnico).
- Al confirmar: congela `frozenTotal` (inmutable en adelante), crea/actualiza la CxC (sin
  duplicar), resuelve el estado de facturación y recalcula la segmentación y deuda del cliente
  (`segment`, `hasDebt`) — todo atómico.
- La CxC **nace solo aquí**, nunca a partir de la cotización.
- Anticipos ≥ total → la CxC nace con saldo 0 y estado `PAID`.

---

## Pagos y anticipos

- Se puede pagar **antes** de terminar (anticipo) o al liquidar.
- Un pago **no puede exceder** el saldo de la CxC. El monto debe ser > 0.
- Cada pago genera automáticamente un movimiento de caja (INCOME).
- Los anticipos se descuentan del total al calcular el saldo del cierre.

---

## Facturación

Estados: `NO_REQUERIDA`, `PENDIENTE_DATOS`, `LISTA_PARA_FACTURAR`, `FACTURADA`, `CANCELADA`.
El cierre resuelve el estado inicial: sin factura → `NO_REQUERIDA`; con factura y sin datos
fiscales → `PENDIENTE_DATOS`; con datos → `LISTA_PARA_FACTURAR`. Existe una bandeja de
facturación pendiente para no perder órdenes por facturar. Emisión genera snapshot inmutable
con folio correlativo único (`FAC-XXXX`) y UUID fiscal v1. Cancelación requiere motivo SAT
y pasa la OT a `CANCELADA`. Detalle en [`invoicing.md`](./invoicing.md).

---

## Portal del cliente

- Acceso por token de OT o búsqueda pública (código, placas ≥5, teléfono ≥10). Sin login.
- Muestra **solo** notas marcadas visibles al cliente; nunca notas internas.
- **Encuesta de satisfacción:** solo si la OT está `ENTREGADA`, y **una sola vez** por OT.

---

## Inventario y Activos del Taller

- **Separación de dominios:**
  - **Refacciones y consumibles (`Article`):** Materiales con Kardex de existencias. `PARTE_EN_VENTA` requiere precio de venta; `CONSUMIBLE` es insumo interno del taller. Al asignar refacciones a una OT, el stock baja automáticamente. **El stock nunca queda negativo** (validado en dominio y protegido en BD).
  - **Herramientas y equipo (`Tool`):** Activos fijos propios del taller (escáneres, elevadores, herramienta neumática/manual). Se gestionan por número de serie, condición física, técnico asignado y mantenimiento. **Nunca** se cobran ni se consumen como ítem de inventario en una OT.
- **Alertas de stock:** Si un artículo cae por debajo de su `minStock`, se genera una alerta automática de stock bajo.
- **Piezas en custodia (`CustodyItem`):** Registro de pertenencias del cliente resguardadas en taller, con evidencia fotográfica y confirmación de entrega.

---

## Ciclo de vida y borrado

- La OT **no se borra** una vez iniciado el trabajo: solo en estado `RECIBIDA` o `CANCELADA`.
- Un **cliente** no se borra si tiene órdenes activas.
- Usuarios, artículos, herramientas y proveedores usan **soft-delete** (se desactivan, no se eliminan).
- Estados terminales (`CERRADA`, `CANCELADA`) son inmutables.

> La ubicación técnica de cada imposición está en [`work-orders.md`](./work-orders.md),
> [`finance.md`](./finance.md), [`invoicing.md`](./invoicing.md), [`inventory.md`](./inventory.md) y [`auth.md`](./auth.md).
