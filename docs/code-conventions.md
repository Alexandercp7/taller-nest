# Convenciones de Código

Cómo se escribe un módulo para que todos los slices se vean iguales.

---

## Anatomía de un vertical slice

```
<módulo>/
├── domain/                    ← puro: sin NestJS, sin Prisma; 100% testeable
│   ├── <x>.constants.ts       (enums, tablas de transición)
│   ├── <x>-state-machine.ts
│   └── <x>.calculator.ts / .validator.ts
├── dto/
│   ├── create-<x>.dto.ts      (class-validator)
│   └── update-<x>.dto.ts
├── <módulo>.service.ts        ← app logic; Prisma directo; métodos tx-aware
├── <módulo>.controller.ts     ← HTTP, guards, swagger
└── <módulo>.module.ts         ← exporta el service si otro slice lo consume
```

| Capa | Qué va aquí | Qué NO va |
|---|---|---|
| `domain/` | Reglas puras: transiciones, cálculos (IVA, descuento), validadores (stock, saldo). Todo probable con `expect(fn(x)).toBe(y)`. | NestJS, Prisma, IO. |
| `service` | Orquestación, acceso a Prisma, checks de rol, auditoría, transacciones. | Reglas de negocio complejas (van en `domain/`). |
| `controller` | Validar DTO, aplicar guard de permiso, mapear a respuesta. | Lógica; solo traduce HTTP ↔ service. |
| `dto` | Forma y validación de entrada/salida (`class-validator`). | Entidades Prisma crudas expuestas al exterior. |

> **No hay repositorios ni mappers.** El service habla con `PrismaService` directo (decisión de
> vertical slice). El único aislamiento es `domain/`.

## Naming

- Módulos y carpetas en **plural** (`users/`, `work-orders/`), kebab-case.
- Clases `PascalCase`; archivos `kebab-case.rol.ts` (`create-user.dto.ts`, `users.service.ts`).
- Enums en `UPPER_SNAKE` (`EN_REPARACION`, `APPROVED`).
- Permisos con patrón `recurso:accion` (`user:manage`, `quotation:override-price`).
- Casos de uso como verbo: `confirmCommercialClose`, `recalculateTag`.
- Constantes de dominio en `<x>.constants.ts`; nada de "números mágicos" dispersos.

## Transacciones (regla de oro)

Ningún servicio abre `$transaction` salvo el orquestador del caso de uso. Todo método que
escribe acepta `tx?` opcional:

```typescript
async upsertReceivableFromClose(wo: WorkOrderSnapshot, tx?: Prisma.TransactionClient) {
  const db = tx ?? this.prisma;   // única línea que decide el cliente
  // ... db.accountReceivable.upsert(...)
}
```

```typescript
// orquestador: compone varios services en UNA transacción
return this.prisma.$transaction(async (tx) => {
  const wo  = await this.workOrders.freezeCommercialClose(dto, actor, tx);
  const cxc = await this.finance.upsertReceivableFromClose(wo, tx);
  await this.clients.recalculateTag(wo.clientId, tx);
  await this.audit.log({ /* ... */ }, tx);
  return cxc;
});
```

## Errores → HTTP

Excepciones de dominio tipadas (`common/exceptions/`), mapeadas por un filtro global:

| Excepción | HTTP |
|---|---|
| `InvalidStateTransitionException` | 400 |
| `InsufficientStockException` | 409 |
| `PaymentExceedsBalanceException` | 409 |
| `DuplicateSurveyException` | 409 |
| `SurveyNotAllowedException` | 422 |
| `ClientHasActiveOrdersException` | 409 |
| `ForbiddenActionException` | 403 |

## Dinero y estados

- Montos: `Decimal(12,2)` en schema; aritmética con `Prisma.Decimal`, nunca `number`.
- Estados: siempre vía la máquina de estados (`domain/`); prohibido `if (status === ...)` para
  decidir transiciones fuera de la máquina.

## Validación y seguridad

- `ValidationPipe` global: `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- `@RequirePermission('recurso:accion')` en el controller + revalidación de rol en el service
  para acciones sensibles (doble defensa).
- Nunca loguear tokens, hashes ni contraseñas (redacción en Pino).
- `workshopId` en toda entidad raíz (multi-tenancy pasiva).

## Definition of Done

Compila en strict, sin `any` injustificado · lógica de dominio con unitarias · transiciones y
montos con test · pasa lint · acciones sensibles auditadas · respeta estas convenciones.
