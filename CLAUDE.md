# CLAUDE.md — `taller-back`

ERP para taller automotriz. **NestJS v11 · PostgreSQL · Prisma · TypeScript (strict).**
Estilo: **modular monolith + vertical slice**, 18 bounded contexts, tenant único (multi-tenant
listo pero pasivo).

**Documentación en `docs/` — leer antes de decidir o implementar:**
- [`docs/architecture.md`](docs/architecture.md) — índice, overview, ADRs, contextos, dependencias.
- [`docs/business-rules.md`](docs/business-rules.md) — reglas de **dominio** (tags, IVA, descuentos, aprobación, encuesta…).
- [`docs/code-conventions.md`](docs/code-conventions.md) — anatomía de slice, capas, naming, regla de oro transaccional.
- [`docs/api-conventions.md`](docs/api-conventions.md) — REST, versionado, errores, paginación, filtros.
- [`docs/performance.md`](docs/performance.md) — índices, N+1, paginación, reportes.
- [`docs/testing.md`](docs/testing.md) — estrategia y casos obligatorios.
- [`docs/diagrams.md`](docs/diagrams.md) — contextos, dependencias, agregado OT, flujos de cierre y pago.
- Módulos: [`docs/auth.md`](docs/auth.md) · [`docs/work-orders.md`](docs/work-orders.md) · [`docs/quotation.md`](docs/quotation.md) · [`docs/finance.md`](docs/finance.md) · [`docs/inventory.md`](docs/inventory.md).

---

## Reglas NO negociables (violarlas es un bug)

1. **Vertical slice.** Cada módulo es su bounded context. El service usa `PrismaService`
   directo; **no** hay repositorios ni mappers. Solo la lógica pura (máquinas de estado,
   calculadoras, validadores) vive en `<módulo>/domain/`, sin NestJS ni Prisma.
2. **Sin event bus (v1).** La consistencia entre módulos es transaccional, no por eventos.
3. **Regla de oro transaccional.** Ningún servicio abre `prisma.$transaction()` salvo el
   orquestador del caso de uso. Todo método que escribe acepta `tx?: Prisma.TransactionClient`
   y usa `const db = tx ?? this.prisma;`. Componer siempre dentro de una sola transacción.
4. **Dinero en `Decimal(12,2)`**, nunca `Float`. Aritmética con `Prisma.Decimal`. IVA (16%) y
   descuento se guardan **separados**; el IVA nunca entra al ingreso neto. (Fórmulas:
   `docs/business-rules.md`.)
5. **Tres máquinas de estado estrictas** (operativa 11, comercial 8, facturación 5) como value
   objects puros en `work-orders/domain/`. Toda transición pasa por la máquina (rechaza inválidas,
   400). No dispersar `if` de estado.
6. **Cotización con aprobación por línea.** `QuotationLine.approvalStatus`; las rechazadas se
   conservan (analítica), no se borran; recotizar = línea nueva con `reQuotedFromLineId`. El
   cierre suma **solo** líneas APPROVED y ejecutadas.
7. **CxC nace solo al confirmar el cierre comercial** (orquestador `commercial-close/`, misma
   transacción). No duplicar en recierre (`upsert` por `workOrderId`).
8. **Auditoría:** `auditService.log(entry, tx?)` (tabla polimórfica) dentro de la tx. Append-only.
9. **Autorización:** RBAC + permisos granulares. **ADMIN** bypass total; **DIRECTOR** todo
   **excepto** `user:manage`. `@RequirePermission(...)`. (Detalle: `docs/auth.md`.)
10. **Soft-delete** (usuarios, artículos, proveedores): desactivar, nunca borrar. OT borrable solo
    en `RECIBIDA`/`CANCELADA`; cliente no borrable con OT activa.
11. **Seguridad auth:** argon2; access corto + refresh rotatorio revocable (hasheado); revalidar
    `isActive` en cada request.
12. **`workshopId`** en toda raíz (multi-tenancy pasiva); no filtrar aún.

## Convenciones

Ver `docs/code-conventions.md` (código) y `docs/api-conventions.md` (API pública). En corto:
slices en plural; enums `UPPER_SNAKE`; permisos `recurso:accion`; DTOs con `class-validator` +
`ValidationPipe` global; excepciones de dominio tipadas → filtro global → HTTP; nunca loguear
tokens/hashes/contraseñas; lógica testeable en `domain/`.

## Comandos

```bash
npm run start:dev            # levantar en watch
npx prisma migrate dev       # aplicar migración
npx prisma generate          # regenerar cliente
npm run test                 # unitarias
npm run test:e2e             # e2e (Supertest)
npm run lint                 # eslint
```

## Definition of Done

Compila en strict · sin `any` sin justificar · lógica de negocio cubierta por unitarias ·
transiciones y montos con test · pasa lint · toda acción sensible audita · respeta las 12 reglas.

---

## Los tres agentes (política de uso)

Subagentes en `.claude/agents/`. Orquestación del hilo principal:

- **`arquitecto`** — decisiones de diseño, límites de módulo, modelado, trade-offs. Delega aquí
  ANTES de escribir código no trivial. Solo lee y edita `docs/`.
- **`nest-engineer`** — implementar: escribir/editar código NestJS + Prisma siguiendo la
  arquitectura ya decidida. Modo por defecto para código.
- **`qa`** — **NO se invoca automáticamente.** Entra **solo** cuando yo lo pida explícitamente:
  «entra QA», «modo QA», «revisa como QA», «pásale QA», «haz QA de esto», «escribe los tests».
  Si no lo pido, no lo uses ni lo sugieras como paso obligatorio.

Flujo típico: *arquitecto diseña → nest-engineer implementa → (yo pido) qa revisa/prueba.*
