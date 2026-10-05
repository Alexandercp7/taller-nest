# Diagramas

Todos en Mermaid (texto → se versionan y renderizan en GitHub/Claude Code).

---

## 1. Mapa de bounded contexts

```mermaid
flowchart TB
  subgraph shared[Transversales]
    common; prisma; audit
  end

  IAM[auth + users]
  CRM[clients + vehicles]
  OT[work-orders]
  COT[quotations]
  CC[commercial-close]
  FIN[finance]
  PAY[payments]
  FAC[invoicing]
  INV[inventory]
  SRV[services]
  POR[portal]
  PROD[activities + kpi + dashboard]

  IAM --> CRM & OT & PROD
  CRM --> OT
  SRV --> COT
  INV --> OT
  OT --> COT
  CC --> OT & FIN & CRM
  PAY --> FIN
  FIN --> FAC
  POR -. solo lectura .-> OT
```

---

## 2. Dependencias entre módulos (acíclico)

```mermaid
flowchart LR
  common & prisma & audit -->|importados por todos| ALL(( ))

  auth --> users
  work-orders --> users & quotations & inventory & services
  commercial-close --> work-orders & finance & clients
  payments --> finance
  portal -. lectura .-> work-orders
  vehicles --> clients
  finance --> suppliers
  activities --> kpi
  payment-schedule --> finance
  dashboard --> users
```

Regla anti-circular: `quotations` y `clients` **no** apuntan a `work-orders`.

---

## 3. Agregado Orden de Trabajo

```mermaid
classDiagram
  class WorkOrder {
    +code
    +operationalStatus
    +commercialStatus
    +billingStatus
    +estaRetrasada
    +portalToken
  }
  class Quotation {
    +subtotal
    +taxAmount
    +total
    +clientApprovalStatus
  }
  class QuotationLine {
    +approvalStatus
    +unitPrice
    +finalPrice
    +rejectionReason
  }
  class Execution
  class CommercialClose {
    +frozenTotal
    +cxcId
  }
  class OtNote
  class OtPhoto

  WorkOrder "1" *-- "1" Quotation : dentro del agregado
  Quotation "1" *-- "*" QuotationLine
  WorkOrder "1" *-- "1" Execution
  WorkOrder "1" *-- "0..1" CommercialClose
  WorkOrder "1" *-- "*" OtNote
  WorkOrder "1" *-- "*" OtPhoto

  WorkOrder ..> AccountReceivable : referencia (Finance)
  WorkOrder ..> Invoice : referencia (Billing)
```

Dentro del agregado (misma transacción): cotización, ejecución, cierre. Fuera (por
`workOrderId`): CxC/pagos/caja, estado fiscal, stock.

---

## 4. Flujo del cierre comercial (una transacción)

```mermaid
sequenceDiagram
  actor Asesor
  participant CC as commercial-close
  participant OT as work-orders
  participant FIN as finance
  participant CLT as clients
  participant AUD as audit

  Asesor->>CC: POST /:woId/commercial-close
  activate CC
  Note over CC: prisma.$transaction( tx )
  CC->>OT: freezeCommercialClose(dto, tx)
  OT-->>CC: frozenTotal
  CC->>FIN: upsertReceivableFromClose(wo, tx)
  FIN-->>CC: CxC (balance = total - anticipos)
  CC->>OT: resolveBillingStatus(tx)
  CC->>CLT: recalculateTag(tx)
  CC->>AUD: log(COMMERCIAL_CLOSE, tx)
  Note over CC: commit (o rollback total)
  CC-->>Asesor: CommercialClose
  deactivate CC
```

---

## 5. Flujo de un pago (anticipo o liquidación)

```mermaid
sequenceDiagram
  actor Cajero
  participant PAY as payments
  participant FIN as finance
  participant AUD as audit

  Cajero->>PAY: POST /:woId/payments {amount, terminalCommission}
  activate PAY
  Note over PAY: prisma.$transaction( tx )
  PAY->>FIN: getReceivable(woId, tx)
  FIN-->>PAY: CxC (balance)
  PAY->>PAY: assert amount <= balance (BalanceValidator)
  PAY->>PAY: netAmount = amount - terminalCommission
  PAY->>FIN: createCashMovement(INCOME, amount, tx)
  PAY->>FIN: applyPayment(cxc, amount, tx)  %% balance/status
  PAY->>AUD: log(PAYMENT, tx)
  Note over PAY: commit
  PAY-->>Cajero: Payment
  deactivate PAY
```
