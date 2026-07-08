# Estrategia de Pruebas

La forma de la pirámide la dicta dónde vive la lógica: como el grueso de las reglas está en
`domain/` (puro, sin IO), la mayoría de las pruebas son unitarias y rápidas.

| Nivel | Qué prueba | Herramienta |
|---|---|---|
| Unitario de dominio (mayoría) | Máquinas de estado, calculadora IVA/descuento, validadores stock/saldo, tag | Jest, sin BD |
| Servicio | Orquestación con Prisma mockeado | Jest + mocks |
| Integración | Repos Prisma reales, transacción del cierre, `FOR UPDATE`, constraints, upsert CxC | Testcontainers (Postgres real) |
| E2E | Endpoints, guards, autorización, portal público | Supertest |

## Casos obligatorios (por riesgo)

- Máquina operativa: **121 combinaciones** (11×11) válidas ✓ e inválidas ✗. También comercial y facturación.
- Cierre con anticipos ≥ total → CxC `PAID`, saldo 0.
- Recierre **no** duplica la CxC.
- Pago > saldo → revierte todo el acto (transacción).
- Pago ≤ 0 → rechazado.
- Stock concurrente nunca queda negativo (`FOR UPDATE` + `CHECK`).
- Portal **no** expone notas internas; una sola encuesta por OT; solo si `ENTREGADA`.
- Auth: login genérico (no enumera correos); rotación de refresh; reuse → revoca familia;
  usuario inactivo no entra; DIRECTOR no puede `user:manage`.

## Test insignia — máquina de estados

```typescript
describe('WorkOrderStateMachine', () => {
  const ALL = Object.values(OperationalStatus);
  for (const from of ALL) for (const to of ALL) {
    const valid = VALID_OPERATIONAL_TRANSITIONS[from].includes(to);
    it(`${from} -> ${to} ${valid ? 'permitida' : 'rechazada'}`, () => {
      const act = () => WorkOrderStateMachine.assertOperationalTransition(from, to);
      valid ? expect(act).not.toThrow() : expect(act).toThrow(InvalidStateTransitionException);
    });
  }
});
```

## Convenciones

- Fixtures/factories de test reutilizables por módulo. Base de datos real por Testcontainers
  para integración (no mocks de Prisma cuando se prueban transacciones/constraints).
- Cada bug encontrado por QA se acompaña de un test que lo reproduce antes del fix.
