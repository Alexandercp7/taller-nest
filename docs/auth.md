# Módulos: `auth` + `users`

Identidad, sesión y autorización. Reemplazan por completo el stub `user/`.

## Entidades

- `User(workshopId, email unique, passwordHash, firstName, lastName, role, kpiTitle, isActive)`
- `Permission(code unique, label)` — catálogo **sembrado**, no editable en runtime.
- `UserPermission(userId, permissionId, granted)` — permisos granulares por usuario.
- `RefreshToken(userId, tokenHash, familyId, expiresAt, revokedAt)` — refresh **hasheado**.
- Enum `Role { ADMIN | DIRECTOR | SERVICE_ADVISOR | TECHNICIAN }`.

> `kpiTitle` (título del organigrama) es descriptivo y **no** afecta permisos. No confundir con `role`.

## Decisiones de seguridad

- **argon2** (`argon2id`) para contraseñas. Nunca se guarda ni loguea el texto plano.
- **Access token** corto (15 min) + **refresh token** largo (7 días) **rotatorio y revocable**.
- **Revalidación de `isActive`** en cada request: usuario desactivado no entra aunque tenga token
  vigente.

## Autenticación

- **Login:** usuario inexistente, inactivo o contraseña incorrecta → **mismo** 401 genérico
  (no enumerar correos).
- **Refresh (rotación por familia):** si llega un refresh con firma válida pero cuyo hash ya no
  está en BD → es un token ya rotado que se está reusando ⇒ **robo**: se revoca toda la
  `familyId` y 401. Si es válido: se revoca el actual y se emite uno nuevo en la misma familia.
- **Logout:** revoca el refresh (o su familia).
- **Cambio de contraseña:** verifica la actual (argon2) y revoca todas las sesiones del usuario.

## Autorización: RBAC + permisos + bypass asimétrico

`@RequirePermission('recurso:accion')` + `PermissionsGuard`. Regla del negocio (importante):

- **ADMIN:** bypass total.
- **DIRECTOR:** opera todo **excepto** `user:manage` (la administración de usuarios es exclusiva
  de ADMIN). Por eso Director **no** es bypass ciego.
- **Resto:** por permiso efectivo (rol base + `UserPermission`).

Doble defensa: el guard corta en HTTP; el service revalida el rol en acciones sensibles.

## `JwtStrategy` (revalida isActive)

En `validate()`, carga el usuario con sus permisos concedidos; si `!user || !user.isActive` →
401. Devuelve `{ id, role, workshopId, effectivePermissions }` como `req.user` / `@CurrentUser()`.
Es una query por request — trivial a este volumen; no cachear prematuramente
([`performance.md`](./performance.md)).

## `users/` — reglas

- Crear/editar/rol/permisos: solo `user:manage` (ADMIN). Soft-delete: `isActive=false`, nunca
  borra; al desactivar, revoca sus refresh tokens.
- **No desactivar al último ADMIN activo.** Listados ocultan inactivos salvo `?includeInactive=true`.
- Toda alta, cambio de rol/permisos y desactivación se audita.

## Endpoints (v1)

`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `PATCH /auth/password` ·
`GET /users/me` · `POST /users` · `GET /users` · `PATCH /users/:id` ·
`PUT /users/:id/permissions` · `DELETE /users/:id`.
Permisos y códigos de error en [`api-conventions.md`](./api-conventions.md).
