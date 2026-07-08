# taller-back

ERP para taller automotriz. **NestJS v11 · PostgreSQL · Prisma · TypeScript (strict)**.
Arquitectura: modular monolith + vertical slice, tenant único (multi-tenant listo pero pasivo).

Documentación de dominio y arquitectura completa en [`docs/`](docs/architecture.md).
Convenciones de código y API en [`docs/code-conventions.md`](docs/code-conventions.md) y
[`docs/api-conventions.md`](docs/api-conventions.md).

## Requisitos

- Node.js
- PostgreSQL
- Variables de entorno en `.env` (ver `.env` de ejemplo): `DATABASE_URL`, `JWT_ACCESS_SECRET`,
  `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`.

## Instalación

```bash
npm install
```

## Base de datos (Prisma)

```bash
npx prisma migrate dev     # aplicar migraciones en desarrollo
npx prisma generate        # regenerar el cliente Prisma
```

## Levantar el proyecto

```bash
npm run start:dev          # watch mode (desarrollo)
npm run start              # sin watch
npm run start:prod         # build compilado (dist/main)
```

El servidor levanta por defecto en `http://localhost:3000` (`PORT` en `.env` para cambiarlo).
No hay prefijo `/api/v1` implementado todavía (ver `src/main.ts`); las rutas son planas
(`/auth/...`, `/users/...`).

## Tests

```bash
npm run test        # unitarias
npm run test:e2e    # e2e (Supertest)
npm run test:cov    # cobertura
```

## Lint

```bash
npm run lint
```

## Probar la API

Usar [`restclient.http`](restclient.http) con la extensión **REST Client** de VSCode: contiene
todos los endpoints actuales, encadenando login → uso automático del `accessToken`/`refreshToken`.

También hay documentación OpenAPI/Swagger generada desde los DTOs (`@nestjs/swagger`) si el
módulo Swagger está montado en `main.ts`.

## Endpoints actuales

Autenticación: `Authorization: Bearer <accessToken>`. Los marcados como **público** no requieren
token; el resto sí. Los que requieren un permiso puntual lo indican entre paréntesis (`ADMIN`
siempre tiene bypass total; `DIRECTOR` tiene todo excepto `user:manage`).

### Auth (`/auth`)

| Método | Ruta             | Auth      | Body                                    | Descripción                                        |
|--------|------------------|-----------|------------------------------------------|-----------------------------------------------------|
| POST   | `/auth/login`    | Público   | `{ email, password }`                    | Login; devuelve `{ accessToken, refreshToken }`.    |
| POST   | `/auth/refresh`  | Público   | `{ refreshToken }`                       | Rota el refresh token y devuelve un nuevo par.      |
| POST   | `/auth/logout`   | Bearer    | `{ refreshToken }`                       | Revoca el refresh token (o su familia). `204`.      |
| PATCH  | `/auth/password` | Bearer    | `{ currentPassword, newPassword }`       | Cambia contraseña; revoca todas las sesiones. `204`.|

### Users (`/users`)

| Método | Ruta                     | Auth                      | Body / Query                                              | Descripción                                  |
|--------|--------------------------|---------------------------|-------------------------------------------------------------|-----------------------------------------------|
| GET    | `/users/me`              | Bearer                    | —                                                             | Perfil del usuario autenticado.               |
| POST   | `/users`                 | Bearer + `user:manage`    | `{ email, firstName, lastName, password, role, kpiTitle? }` | Crea un usuario.                              |
| GET    | `/users`                 | Bearer + `user:manage`    | `?page&limit&includeInactive&role`                          | Lista paginada de usuarios.                   |
| PATCH  | `/users/:id`             | Bearer + `user:manage`    | `{ firstName?, lastName?, kpiTitle?, role? }`                | Actualiza un usuario.                         |
| PUT    | `/users/:id/permissions` | Bearer + `user:manage`    | `{ permissions: [{ permissionId, granted }] }`               | Reemplaza los permisos granulares. `204`.     |
| DELETE | `/users/:id`             | Bearer + `user:manage`    | —                                                             | Soft-delete (`isActive = false`). `204`.      |

Detalle de reglas de negocio (rotación de refresh, bypass ADMIN/DIRECTOR, no desactivar al último
ADMIN, etc.) en [`docs/auth.md`](docs/auth.md).
