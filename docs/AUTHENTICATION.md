# Authentication & Roles

This document describes the authentication and role-based access implementation for the Mini ERP + CRM backend.

Overview
- JWT-based authentication.
- Passwords hashed with `bcrypt`.
- Roles: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`.

Endpoints

- `POST /api/auth/login` — Request: `{ email, password }` — Response: `{ token, user }` (user excludes passwordHash).
- `GET /api/auth/me` — Requires `Authorization: Bearer <token>` — Response: current user object.

Environment

Add to `.env` (do not commit `.env`):

```
JWT_SECRET=your-local-development-secret
JWT_EXPIRES_IN=1d
```

Security notes
- Passwords are hashed with `bcrypt` before being stored.
- JWT secret must be provided via `JWT_SECRET` environment variable.
- The API never returns `passwordHash`.

Middleware

- `authenticate` verifies the JWT and attaches `req.user`.
- `requireRole(...roles)` verifies the authenticated user's role and returns `403` if unauthorized.

Seed

The existing seed already creates four users (Admin, Sales, Warehouse, Accounts) with hashed passwords.
