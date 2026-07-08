# Arquitectura — `taller-back`

> **Índice de la documentación.** Este archivo es el punto de entrada: overview, decisiones y
> mapa de navegación. El detalle vive en documentos temáticos enlazados abajo — este no debe
> volver a crecer a 700 líneas.

ERP para taller automotriz. **NestJS v11 · Node.js LTS · PostgreSQL 16 · Prisma · TypeScript
(strict).** Estilo: **modular monolith + vertical slice**, 18 bounded contexts, tenant único
(multi-tenant preparado pero pasivo).

Regla que gobierna el diseño financiero: **la cotización negocia, el cierre comercial cobra.**
Finanzas nunca reconoce ingreso a partir de la cotización.

---

## Mapa de la documentación

| Documento | Contenido |
|---|---|
| [`architecture.md`](./architecture.md) | Este índice: overview, ADRs, contextos, dependencias. |
| [`diagrams.md`](./diagrams.md) | Diagramas: contextos, dependencias, agregado OT, flujos de cierre y pago. |
| [`business-rules.md`](./business-rules.md) | **Reglas de dominio** (tags, IVA, descuentos, aprobación, encuesta…). |
| [`api-conventions.md`](./api-conventions.md) | Contrato público: REST, versionado, errores, paginación, filtros. |
| [`code-conventions.md`](./code-conventions.md) | Anatomía de un slice, DTO/service/controller, naming, enums. |
| [`performance.md`](./performance.md) | Índices esperados, N+1, paginación, reportes, read models. |
| [`testing.md`](./testing.md) | Estrategia y casos obligatorios. |
| [`auth.md`](./auth.md) | Módulo de autenticación y usuarios. |
| [`work-orders.md`](./work-orders.md) | Núcleo OT: agregado, máquinas de estado, secciones. |
| [`quotation.md`](./quotation.md) | Cotización, aprobación por línea, override de precio. |
| [`finance.md`](./finance.md) | CxC, pagos, caja, comisiones, reportes, CxP. |

> Los módulos restantes (inventory,vehiclesclients, price-list, invoicing, payment-schedule, suppliers,
> portal, activities, kpi, dashboard) se documentan bajo demanda con la misma plantilla de
> [`code-conventions.md`](./code-conventions.md). No todo necesita su propio archivo desde el día uno.

---

## Bounded contexts (resumen)

18 contextos, cada uno un módulo NestJS; `common`, `prisma` y `audit` son transversales.
Mapa visual y grafo de dependencias en [`diagrams.md`](./diagrams.md).

`auth` · `users` · `clients` · `vehicles` · `work-orders` · `quotations` · `commercial-close` ·
`payments` · `invoicing` · `inventory` · `price-list` · `finance` · `payment-schedule` ·
`suppliers` · `portal` · `activities` · `kpi` · `dashboard`

**Reglas anti-circular:** `quotations/` y `clients/` **no** importan `work-orders/` (reciben
`workOrderId`/consultan Prisma directo). `commercial-close/` es orquestador: depende de varios y
nadie depende de él.

---

## Decisiones de arquitectura (ADR)

> Las decisiones marcadas *(v1)* son deliberadamente acotadas a la primera versión; la costura
> para revisarlas está prevista. No son permanentes.

| # | Decisión | Elección | Justificación |
|---|---|---|---|
| ADR-01 | Despliegue | Monolito modular | Equipo de 2 y primer cliente; fronteras limpias permiten extraer módulos después. |
| ADR-02 | Estilo interno | Vertical slice | Service usa Prisma directo; solo la lógica pura se aísla en `domain/`. Menos ceremonia. |
| ADR-03 | Consistencia | Transacción única, **sin event bus** *(v1)* | Las invariantes clave son transaccionales. Un event bus **no se usará en la versión 1**; se evaluará cuando haya efectos externos irreversibles. |
| ADR-04 | Jobs asíncronos | `@nestjs/schedule`; **sin cola de mensajes** *(v1)* | BullMQ/pg-boss **no en v1** (evita infra extra). Se incorporará si el volumen o los efectos diferidos lo justifican. |
| ADR-05 | Máquinas de estado | Value objects puros en `domain/` | Tres tablas de transición, testeables sin NestJS/Prisma. |
| ADR-06 | Dinero | `Decimal(12,2)` + decimal.js | Nunca `Float`. Detalle de fórmulas en [`business-rules.md`](./business-rules.md). |
| ADR-07 | Auditoría | Tabla `AuditLog` polimórfica, tx-aware | Un solo `auditService.log()` desde cualquier slice, dentro de la transacción. |
| ADR-08 | Aprobación de cotización | Por línea, con retención de rechazadas | Detalle en [`quotation.md`](./quotation.md) y [`business-rules.md`](./business-rules.md). |
| ADR-09 | Cierre comercial | Módulo orquestador | Coordina work-orders + finance + clients en una transacción. Flujo en [`diagrams.md`](./diagrams.md). |
| ADR-10 | Multi-tenancy | `workshopId` pasivo *(v1)* | Presente en todas las raíces; **no se activa en v1**. Middleware Prisma + claim JWT cuando sea SaaS. |
| ADR-11 | Facturación | Estado fiscal interno; **sin timbrado CFDI** *(v1)* | Billing maneja estado, no integra un PAC en v1. Adaptador aislado para cuando toque. |
---

## La regla de oro transaccional

Sin event bus (ADR-03), la atomicidad depende de una convención única: **ningún servicio abre
`prisma.$transaction()` salvo el orquestador del caso de uso; todo método que escribe acepta
`tx?: Prisma.TransactionClient` y usa `const db = tx ?? this.prisma;`**. Detalle y ejemplo en
[`code-conventions.md`](./code-conventions.md); flujo del cierre en [`diagrams.md`](./diagrams.md).

---

## Fuera de alcance (v1)

No se implementan en la versión 1, con la costura lista para incorporarlos sin reescritura:
timbrado CFDI real (ADR-11), activación de multi-tenancy (ADR-10), event bus (ADR-03), cola de
trabajos tipo BullMQ (ADR-04).
