# Módulo: `quotations`

Presupuesto que se presenta al cliente. Es **propuesta**, no ingreso: finanzas nunca reconoce
dinero desde aquí. Reglas de dominio en [`business-rules.md`](./business-rules.md).

## Entidades

- `Quotation(workOrderId, subtotal, taxAmount, total, aplicaIva, discountType, discountValue, clientApprovalStatus)`
- `QuotationLine(quotationId, lineType {SERVICE|PART}, concept, quantity, unitPrice, finalPrice,
  priceOverrideReason, priceOverrideById, approvalStatus {PENDING|APPROVED|REJECTED},
  rejectionReason, reQuotedFromLineId)`

Todos los montos `Decimal(12,2)`.

## Aprobación por línea (decisión clave)

- El cliente aprueba/rechaza **por línea**. Aprobación parcial no detiene la OT.
- Rechazadas se **conservan** (inmutables) con `rejectionReason` → analítica de rechazos
  (`@@index([approvalStatus])`).
- Recotizar = línea nueva con `reQuotedFromLineId` a la original (histórico "ofrecí X / reofrecí Y").
- `clientApprovalStatus` se deriva: todas aprobadas → total; mezcla → parcial; todas → rechazada.
- El cierre suma **solo** líneas `APPROVED` y ejecutadas.

## Cálculo (en `domain/quotation-calculator.ts`, puro)

`base = subtotal − descuento` (PERCENT o FIXED, antes de IVA) · `iva = aplicaIva ? base×0.16 : 0`
· `total = base + iva`. Es el **mismo** cálculo que usa el cierre comercial.

## Override de precio

ADMIN/DIRECTOR/ASESOR ajustan `finalPrice` de una línea con motivo (auditado, before/after); el
Técnico solo sugiere vía nota. **No** altera el catálogo base ([`inventory.md`](./inventory.md) /
price-list).

## PDF

Generación **síncrona** en el request con `pdfkit` (v1; el volumen de un taller lo tolera).

## Endpoints (v1)

`POST /work-orders/:woId/quotation/lines` · `PATCH /quotation/lines/:id/price` ·
`POST /work-orders/:woId/quotation/approve` (respuesta por línea) ·
`GET /work-orders/:woId/quotation/pdf`.
