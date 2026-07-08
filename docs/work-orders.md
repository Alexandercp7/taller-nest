# Módulo: `work-orders` (núcleo)

Aggregate root del sistema. Coordina las tres máquinas de estado y es dueño de "qué se cobra"
(cotización → cierre). Ver el agregado y los flujos en [`diagrams.md`](./diagrams.md); las reglas
de dominio en [`business-rules.md`](./business-rules.md).

## Entidades

- `WorkOrder(code, clientId, vehicleId, serviceAdvisorId, operationalStatus, commercialStatus, billingStatus, estaRetrasada, portalToken, workshopId)`
- Sub-recursos: `OtReceptionChecklist`, `OtQcChecklist`, `OtNote(isClientVisible)`, `OtPhoto`.
- Dentro del agregado: `Quotation` (ver [`quotation.md`](./quotation.md)), `Execution`,
  `CommercialClose`. Fuera (por `workOrderId`): CxC/pagos (finance), `Invoice` (billing), stock (inventory).

## Máquinas de estado (en `domain/`, puras)

Tres tablas de transición estrictas; toda transición pasa por `WorkOrderStateMachine`, que
rechaza las inválidas (400).

- **Operativa (11):** `RECIBIDA → EN_DIAGNOSTICO → EN_ESPERA_COTIZACION ⇄ EN_ESPERA_APROBACION →
  EN_REPARACION → CONTROL_CALIDAD → LISTA_PARA_ENTREGA → ENTREGADA → {CERRADA | EN_GARANTIA}`;
  `CANCELADA` desde estados activos. Sin salto directo diagnóstico→reparación; recotizar reingresa
  por `EN_ESPERA_COTIZACION`; aprobación parcial avanza a reparación con lo aceptado.
- **Comercial (8):** `SIN_COTIZAR → COTIZADA → {APROBADA_PARCIAL | APROBADA_TOTAL} → EN_EJECUCION
  → CIERRE_PENDIENTE → {COBRADA_PARCIAL → COBRADA_TOTAL}`.
- **Facturación (5):** el cierre la resuelve (set directo); luego transiciones manuales.

`estaRetrasada` es un flag paralelo, no un estado.

## Reglas y su imposición

| Regla | Dónde |
|---|---|
| Transición válida | `work-order-state-machine.ts` (dominio) |
| Técnico no ejecuta transición comercial | check de rol en el service antes de la máquina |
| Código `OT-0001` único (reintento ×5) | `WorkOrdersService.create` |
| `portalToken` uuid al crear | `WorkOrdersService.create` |
| Vehículo pertenece al cliente | validación al crear |
| Borrado solo `RECIBIDA`/`CANCELADA` | `WorkOrdersService.remove` |

## Endpoints (v1)

`POST /work-orders` · `GET /work-orders` (filtros: estado, asesor, cliente, retrasada) ·
`GET /work-orders/:id` (8 secciones) · `POST /work-orders/:id/status` ·
`PATCH /work-orders/:id/delayed` · `POST /work-orders/:id/notes` · `POST /work-orders/:id/photos`.

Convenciones en [`api-conventions.md`](./api-conventions.md); anatomía en [`code-conventions.md`](./code-conventions.md).
