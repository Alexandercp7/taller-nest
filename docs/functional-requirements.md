# Especificación de Requisitos Funcionales (RF) — `taller-back`

> Documento oficial de Requisitos Funcionales implementados en la plataforma hasta la fecha.
> Define el comportamiento del sistema, reglas de negocio e invariantes sin acoplamiento a decisiones de interfaz gráfica.

---

## 1. Autenticación, Usuarios y Control de Acceso (IAM)

- **RF-01: Autenticación de Usuarios:** El sistema debe autenticar usuarios mediante credenciales (correo electrónico y contraseña con hash Argon2id) y emitir un par de tokens JWT (`accessToken` de corta duración y `refreshToken` de larga duración).
- **RF-02: Rotación y Detección de Reuso de Tokens:** El sistema debe rotar el `refreshToken` en cada renovación; si se detecta el uso de un token revocado o duplicado, debe invalidar inmediatamente toda la familia de tokens asociada a la sesión.
- **RF-03: Control de Acceso Basado en Roles y Permisos (RBAC):** El sistema debe validar permisos granulares por acción (`client:read`, `work-order:write`, `quotation:approve`, `finance:write`, `invoice:write`, etc.). El rol `ADMIN` posee bypass total de permisos.
- **RF-04: Gestión de Usuarios:** El sistema debe permitir el alta, edición, consulta paginada y desactivación (soft-delete) de cuentas de personal (asesores, técnicos, cajeros, administradores).

---

## 2. Gestión de Clientes y Vehículos (CRM)

- **RF-05: Expediente de Clientes:** El sistema debe registrar clientes clasificándolos como Persona Física o Persona Moral, almacenando nombre/razón social, teléfono, correo electrónico y dirección.
- **RF-06: Datos Fiscales Maestros del Cliente:** El sistema debe permitir asociar al cliente sus datos fiscales (RFC, razón social, código postal, régimen fiscal y uso de CFDI) para prellenar y agilizar procesos de facturación recurrentes.
- **RF-07: Registro Vehicular Vinculado:** El sistema debe permitir registrar uno o múltiples vehículos por cliente, validando placa vehicular única, número de serie (VIN), marca, modelo, año y kilometraje actual.
- **RF-08: Segmentación y Detección de Deuda:** El sistema debe calcular y actualizar automáticamente la etiqueta de segmentación del cliente (`NUEVO`, `REGULAR`, `FRECUENTE`, `VIP`, `EN_RIESGO`) y una bandera indicadora de deuda activa (`hasDebt`) cada vez que se modifiquen sus cuentas por cobrar.

---

## 3. Recepción y Órdenes de Trabajo (OT)

- **RF-09: Generación de Folio de Orden:** Cada orden de trabajo debe recibir un identificador correlativo único e incremental por taller (ej. `OT-0001`).
- **RF-10: Registro de Ingreso Técnico:** El sistema debe registrar kilometraje de entrada, porcentaje de nivel de combustible y la descripción detallada de la falla o solicitud del cliente.
- **RF-11: Checklist de Inventario Físico al Ingreso:** El sistema debe capturar el inventario del vehículo recibido (presencia de llaves, llanta de refacción, gato hidráulico, herramientas, extintor y pertenencias personales declaradas).
- **RF-12: Token de Consulta Pública:** Cada orden de trabajo debe generar de manera automática un identificador único seguro (`portalToken` UUID) para permitir consultas externas de estado sin requerir credenciales de sistema.
- **RF-13: Máquina de Estados Operativos:** El sistema debe gobernar la orden a través de 11 estados estrictos y consecutivos:
  $$\text{RECIBIDA} \rightarrow \text{EN\_DIAGNOSTICO} \rightarrow \text{EN\_ESPERA\_COTIZACION} \rightarrow \text{EN\_ESPERA\_APROBACION} \rightarrow \text{EN\_REPARACION} \rightarrow \text{CONTROL\_CALIDAD} \rightarrow \text{LISTA\_PARA\_ENTREGA} \rightarrow \text{ENTREGADA} \rightarrow \text{CERRADA}$$
  *(y rutas alternas: `EN_GARANTIA`, `CANCELADA`)*, bloqueando transiciones no permitidas por la regla de negocio.
- **RF-14: Gestión de Retrasos Operativos:** El sistema debe permitir marcar o desmarcar una orden de trabajo como retrasada (`estaRetrasada`).
- **RF-15: Bitácora de Notas y Avances:** El sistema debe permitir registrar notas de avance técnico diferenciando explícitamente entre notas internas (solo personal) y notas con visibilidad pública para el cliente (`isClientVisible`).
- **RF-16: Evidencia Fotográfica:** El sistema debe clasificar fotografías cargadas a la orden según su fase operativa (`RECEPTION`, `INSPECTION`, `PROCESS`, `QUALITY_CONTROL`, `DELIVERY`) y nivel de privacidad (`isPublic`).

---

## 4. Cotizaciones y Aprobaciones

- **RF-17: Partidas de Cotización:** La cotización debe componerse de líneas detalladas de mano de obra (`SERVICE`) y refacciones/insumos (`PART`), indicando concepto, cantidad, precio unitario y precio final.
- **RF-18: Aprobación Granular por Línea:** El cliente puede aprobar (`APPROVED`) o rechazar (`REJECTED`) de forma individual cada partida. Una aprobación parcial no detiene la orden; el flujo avanza exclusivamente con lo aprobado.
- **RF-19: Conservación de Rechazos:** Las líneas rechazadas no se eliminan; deben conservarse de forma inmutable con su respectivo motivo de rechazo (`rejectionReason`) con fines analíticos.
- **RF-20: Ajuste de Precio Manual (Price Override):** Los usuarios autorizados (`ADMIN`, `DIRECTOR`, `ASESOR`) pueden modificar el precio de una partida justificando el motivo, generando un registro de auditoría sin alterar el catálogo de precios general.
- **RF-21: Descuentos e IVA:** El sistema debe soportar descuentos globales de tipo porcentaje o monto fijo aplicados sobre el subtotal antes de impuestos. El IVA (16%) debe ser opcional por orden (`aplicaIva`) y registrarse en campo separado sin formar parte del ingreso neto operativo.

---

## 5. Cierre Comercial y Cuentas por Cobrar (CxC)

- **RF-22: Orquestación del Cierre Comercial:** El cierre debe ejecutarse en una transacción atómica que congela el total definitivo (`frozenTotal`) calculando únicamente las líneas aprobadas y ejecutadas.
- **RF-23: Generación de Cuenta por Cobrar (CxC):** La CxC solo puede nacer a partir de la confirmación del cierre comercial (nunca desde la cotización inicial), evitando duplicidad en caso de recierres.
- **RF-24: Deducción Automática de Anticipos:** Al generar la CxC, el sistema debe deducir automáticamente cualquier anticipo pagado previamente, fijando el saldo insoluto (`balance`) y el estado de la cuenta (`OPEN`, `PARTIAL` o `PAID`).
- **RF-25: Estados Comerciales de la Orden:** El sistema debe derivar el estado comercial de la OT (`SIN_COTIZAR`, `COTIZADA`, `APROBADA_PARCIAL`, `APROBADA_TOTAL`, `EN_EJECUCION`, `CIERRE_PENDIENTE`, `COBRADA_PARCIAL`, `COBRADA_TOTAL`).

---

## 6. Pagos, Caja y Finanzas

- **RF-26: Registro de Pagos:** El sistema debe registrar cobros clasificados como Anticipo (`ADVANCE`) o Liquidación (`FINAL_SETTLEMENT`), admitiendo los métodos `CASH`, `CARD`, `TRANSFER` y `CHECK`.
- **RF-27: Validación de Saldo:** Todo pago registrado debe ser mayor a cero y no puede exceder el saldo pendiente actual de la cuenta por cobrar asociada.
- **RF-28: Comisiones de Terminal Bancaria:** En pagos con tarjeta, el sistema debe registrar la comisión cobrada por el banco; el cliente amortiza el monto bruto de su deuda, pero en caja ingresa únicamente el importe neto.
- **RF-29: Movimientos Automáticos y Manuales de Caja:** Todo pago recibido debe generar en la misma transacción un movimiento de caja de tipo ingreso (`INCOME`). El sistema debe admitir además el registro de ingresos y egresos (`EXPENSE`) manuales.
- **RF-30: Reporte Financiero Agregado:** El sistema debe computar reportes por periodo mediante agregaciones directas en base de datos, desglosando venta bruta, descuentos concedidos, IVA recaudado, retenciones bancarias por comisiones y flujo neto en caja.

---

## 7. Facturación Interna (Fiscal México / ADR-11)

- **RF-31: Derivación del Estado de Facturación:** El cierre comercial debe resolver el estado fiscal inicial de la orden:
  - Si el cliente no solicita factura $\rightarrow$ `NO_REQUERIDA`.
  - Si solicita factura pero faltan datos fiscales $\rightarrow$ `PENDIENTE_DATOS`.
  - Si solicita factura y los datos fiscales están completos y validados $\rightarrow$ `LISTA_PARA_FACTURAR`.
- **RF-32: Bandeja de Facturación Pendiente:** El sistema debe listar las órdenes en `PENDIENTE_DATOS` y `LISTA_PARA_FACTURAR`, diagnosticando en tiempo real los campos obligatorios omitidos.
- **RF-33: Validación de Estándares SAT (CFDI 4.0):** El sistema debe validar que:
  - El RFC cumpla la estructura oficial para Persona Física (13 caracteres), Moral (12 caracteres) o Genérico (`XAXX010101000` / `XEXX010101000`).
  - El código postal contenga exactamente 5 dígitos numéricos.
  - La clave de Régimen Fiscal pertenezca al catálogo SAT (601, 603, 605, 606, 612, 626, etc.).
  - El Uso de CFDI sea válido (G01, G03, I03, CP01, etc.).
- **RF-34: Actualización y Transición de Datos Fiscales:** Al capturar datos fiscales válidos en una orden en `PENDIENTE_DATOS`, el sistema debe transicionarla automáticamente a `LISTA_PARA_FACTURAR` y opcionalmente actualizar el expediente del cliente.
- **RF-35: Emisión de Factura Interna:** El sistema debe emitir la factura en una transacción que:
  - Asigna el siguiente folio correlativo único del taller (`FAC-0001`, `FAC-0002`...).
  - Genera un snapshot inmutable de los datos del receptor, importes (subtotal, IVA, total) y UUID fiscal v1 simulado.
  - Genera partidas inmutables (`InvoiceItem`) basadas en las líneas de la orden con claves SAT (`78181500`, `E48`).
  - Actualiza la orden de trabajo a estado `FACTURADA`.
- **RF-36: Cancelación de Factura Interna:** El sistema debe permitir cancelar facturas emitidas exigiendo un motivo descriptivo y clave SAT (`01`, `02`, `03`, `04`), marcando la factura como `CANCELLED` y actualizando el estatus fiscal de la orden a `CANCELADA`.

---

## 8. Inventario, Refacciones y Herramientas

- **RF-37: Segmentación de Catálogo de Artículos:** El sistema debe diferenciar entre refacciones para venta (`PARTE_EN_VENTA`, con precio comercial) e insumos internos del taller (`CONSUMIBLE`).
- **RF-38: Kardex y Prevención de Stock Negativo:** Toda entrada, salida por orden de trabajo o ajuste debe registrarse en el Kardex. El sistema debe impedir transacciones que dejen el inventario en saldo negativo.
- **RF-39: Alertas de Reorden:** El sistema debe alertar cuando las existencias de un artículo desciendan por debajo de su umbral mínimo configurado (`minStock`).
- **RF-40: Control de Herramientas y Equipamiento:** Las herramientas deben registrarse como activos propios con número de serie, estatus operativo (`DISPONIBLE`, `EN_USO`, `EN_MANTENIMIENTO`, `DADO_DE_BAJA`) y técnico responsable. No pueden ser consumidas ni cobradas en una orden de trabajo.
- **RF-41: Resguardo de Piezas en Custodia:** El sistema debe controlar el inventario de piezas o pertenencias del cliente bajo resguardo, con evidencia fotográfica y registro de fecha y responsable de entrega.

---

## 9. Servicios y Precios por Tipo de Vehículo

- **RF-42: Catálogo de Mano de Obra y Maquinados:** El sistema debe administrar servicios de mano de obra y trabajos de maquinado/torno.
- **RF-43: Matriz de Precios Vehicular:** El sistema debe permitir definir matrices de precios por servicio según la categoría vehicular (Sedán, SUV, Pickup, Pesado).

---

## 10. Trazabilidad y Auditoría

- **RF-44: Bitácora de Auditoría Polimórfica:** El sistema debe registrar de forma automática en base de datos (`AuditLog`) los cambios de estado, ajustes de precios, cierres comerciales, cobros, emisiones y cancelaciones de facturas, capturando taller, entidad, identificador, acción, usuario ejecutor y estados `before` y `after`.
