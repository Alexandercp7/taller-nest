# Módulo: `inventory`

Control de stock del taller y consumo de refacciones por las OT.

## Entidades

- `Article(workshopId, type {HERRAMIENTA|CONSUMIBLE|EQUIPO|PARTE_EN_VENTA}, stock, minStock, isActive)`
- `StockMovement(articleId, workOrderId?, type {ENTRY|EXIT|ADJUSTMENT}, qty, before, after, reason)`
- Piezas en custodia (partes del cliente resguardadas).

## Invariante crítica: stock nunca negativo

Protección en capas, dentro de la transacción de la asignación:

1. **Dominio:** `stock.validator.ts` rechaza `qty > disponible`.
2. **Bloqueo pesimista:** `SELECT ... FOR UPDATE` sobre la fila del artículo al descontar.
3. **Red de BD:** `CHECK (stock >= 0)`.

Como el descuento se origina en la ejecución real de la OT ([`work-orders.md`](./work-orders.md)),
se ejecuta vía el puerto de inventory dentro de la misma `@Transactional()`. Ver la regla de oro
en [`code-conventions.md`](./code-conventions.md).

## Alerta de stock bajo

Cuando `stock < minStock` tras un movimiento de salida, se emite alerta. Índice parcial
`WHERE stock < minStock` para consultarlo eficiente ([`performance.md`](./performance.md)).

## Movimientos

Todo cambio de stock deja `StockMovement` con `before`/`after` (kardex auditable). Los artículos
usan **soft-delete** (`isActive`).

## Endpoints (v1)

`POST /inventory/articles` · `PATCH /inventory/articles/:id` · `POST /inventory/movements` ·
`GET /inventory/low-stock` · `GET /inventory/articles/:id/kardex`.
