# Role-Based Access Control (RBAC) — Permission Matrix

This document is the single source of truth for what each of the four roles can and cannot
do across every module of the application. It was written during a dedicated RBAC/UX review
pass and consolidates permission decisions that were previously scattered (and, in one module,
incompletely applied on the frontend) across `docs/CUSTOMER_CRM.md` and `docs/SALES_CHALLANS.md`.

## Important: these are implementation decisions, not case-study mandates

The case study requires four roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`) and role-based
access control, but it does **not** specify an exact permission matrix for every module/action
combination. Every row below beyond the few explicitly-required rules (Sales can create/confirm
challans; the system has four roles) is a **project design decision**, made to give each role a
coherent, defensible business purpose. Where a decision was non-obvious, the reasoning is
recorded inline.

Nothing in this document changed backend authorization during this review — the existing
`requireRole` assignments already implemented the target model described below. What changed
was the **frontend**, which had one module (Customer CRM) that didn't yet hide write actions the
backend already rejects. See "What changed in this review" at the bottom.

## Role business purpose

| Role | Purpose |
|---|---|
| **ADMIN** | Full system visibility and management across every module. |
| **SALES** | Owns the customer relationship and the sales/challan workflow end-to-end: customers, follow-ups, challan create/edit/confirm/cancel, PDF export. Does not manage physical inventory (products/warehouses/stock) — that's Warehouse's job. |
| **WAREHOUSE** | Owns physical inventory: products, warehouses, stock IN/OUT movements. Needs challan visibility (to know what's been sold/reserved) and PDF export, but does not create or manage customers or challans. |
| **ACCOUNTS** | Read-oriented visibility across customers, inventory, and challans/totals for financial context, plus PDF export for record-keeping. No operational writes — the case study doesn't define a Payments/Accounting module, so this role is deliberately kept to reads rather than inventing accounting functionality that wasn't asked for. |

## Permission matrix (summary)

`RW` = read + write (create/update, and confirm/cancel where applicable). `R` = read-only.
`Yes`/`—` used for the PDF export action, which is a read-derived action, not a CRUD resource.

| Module | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|
| Customers (incl. follow-ups) | RW | RW | R | R |
| Products | RW | R | RW | R |
| Warehouses | RW | R | RW | R |
| Stock Movements | RW | R | RW | R |
| Challans (create/edit/confirm/cancel) | RW | RW | R | R |
| Challan PDF Export | Yes | Yes | Yes | Yes |

## Permission matrix (per endpoint)

Enforced server-side via `authenticate` (JWT) + `requireRole(...roles)` middleware on every
route in `backend/src/modules/**/*.routes.ts`. This is the actual security boundary — the
frontend only mirrors it for UX (see below).

### Customers — `backend/src/modules/customers/customers.routes.ts`

| Method & Path | Action | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|---|
| `GET /api/customers` | List | ✅ | ✅ | ✅ | ✅ |
| `GET /api/customers/:id` | Detail (incl. follow-up history) | ✅ | ✅ | ✅ | ✅ |
| `POST /api/customers` | Create | ✅ | ✅ | ❌ | ❌ |
| `PATCH /api/customers/:id` | Update | ✅ | ✅ | ❌ | ❌ |
| `POST /api/customers/:id/follow-ups` | Add follow-up | ✅ | ✅ | ❌ | ❌ |

### Products — `backend/src/modules/inventory/products/products.routes.ts`

| Method & Path | Action | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|---|
| `GET /api/products` | List | ✅ | ✅ | ✅ | ✅ |
| `GET /api/products/:id` | Detail | ✅ | ✅ | ✅ | ✅ |
| `GET /api/products/:id/stock-movements` | Stock history | ✅ | ✅ | ✅ | ✅ |
| `POST /api/products` | Create | ✅ | ❌ | ✅ | ❌ |
| `PATCH /api/products/:id` | Update | ✅ | ❌ | ✅ | ❌ |
| `POST /api/products/:id/stock-movements` | Record stock IN/OUT | ✅ | ❌ | ✅ | ❌ |

Sales can view products/stock (needed to build challans) but cannot create/edit products or
touch stock directly — that would bypass the Challan-driven stock deduction/reversal flow.

### Warehouses — `backend/src/modules/inventory/warehouses/warehouses.routes.ts`

| Method & Path | Action | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|---|
| `GET /api/warehouses` | List | ✅ | ✅ | ✅ | ✅ |
| `GET /api/warehouses/:id` | Detail | ✅ | ✅ | ✅ | ✅ |
| `POST /api/warehouses` | Create | ✅ | ❌ | ✅ | ❌ |
| `PATCH /api/warehouses/:id` | Update | ✅ | ❌ | ✅ | ❌ |

### Challans — `backend/src/modules/challans/challans.routes.ts`

| Method & Path | Action | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|---|
| `GET /api/challans` | List | ✅ | ✅ | ✅ | ✅ |
| `GET /api/challans/:id` | Detail (also the data source for PDF export) | ✅ | ✅ | ✅ | ✅ |
| `POST /api/challans` | Create (DRAFT or CONFIRMED) | ✅ | ✅ | ❌ | ❌ |
| `PATCH /api/challans/:id` | Edit (DRAFT only) | ✅ | ✅ | ❌ | ❌ |
| `POST /api/challans/:id/confirm` | Confirm | ✅ | ✅ | ❌ | ❌ |
| `POST /api/challans/:id/cancel` | Cancel | ✅ | ✅ | ❌ | ❌ |

### PDF export

Implemented entirely client-side (`frontend/src/lib/challanPdf.ts`) from data already returned
by `GET /api/challans/:id`. There is no separate PDF endpoint or permission check — export
availability is exactly whatever `GET /api/challans/:id` availability is, i.e. all four roles.

### Auth

| Method & Path | Action | Who |
|---|---|---|
| `POST /api/auth/login` | Log in | Public (no token required) |
| `GET /api/auth/me` | Current user | Any authenticated user, any role |

## Error semantics (all modules)

| Status | When |
|---|---|
| `401` | No `Authorization` header, malformed header, invalid/expired JWT, or the token's user no longer exists/is inactive |
| `403` | Valid, authenticated request, but `req.user.role` is not in the route's allowed-roles list |
| `404` | Resource not found (checked after auth/role, so an unauthorized user gets `403` before `404`, never leaking existence of a resource they can't access) |

## Frontend enforcement (UX only)

The frontend mirrors the backend matrix above so that users only ever see actions they're
actually allowed to perform — but this is presentation, not security. Every write endpoint
independently re-checks the role server-side regardless of what the UI shows or hides.

`frontend/src/lib/permissions.ts` — role-check helpers, one per write-gated module:

| Helper | Allowed roles | Mirrors |
|---|---|---|
| `canWriteCustomers(role)` | `ADMIN`, `SALES` | Customers `WRITE_ROLES` |
| `canWriteInventory(role)` | `ADMIN`, `WAREHOUSE` | Products/Warehouses `WRITE_ROLES` |
| `canWriteChallans(role)` | `ADMIN`, `SALES` | Challans `WRITE_ROLES` |

Each write-capable page follows the same two patterns, consistently applied across all four
modules as of this review:

1. **List/detail pages** — conditionally render Add/Edit/Confirm/Cancel buttons and links behind
   the relevant `canWrite*` check (e.g. `CustomerListPage`'s "+ Add Customer", `ProductDetailPage`'s
   stock-movement form, `ChallanDetailPage`'s Confirm/Cancel buttons).
2. **Form pages** (`.../new`, `.../:id/edit`) — redirect away (`<Navigate to="..." replace />`)
   at the top of the component if `!canWrite`, so a write-restricted role can't reach an
   operational form via a typed-in or bookmarked URL, even though the backend would reject the
   submission anyway.

Navigation (`frontend/src/components/Layout.tsx`) intentionally shows all four top-level links
(Customers/Products/Warehouses/Challans) to every role — every module has at least read access
for every role, so there is no module to hide from the nav entirely. Hiding happens at the
action level (buttons/forms) instead, per the patterns above.

## What changed in this review (`feature/final-rbac-ux`)

Backend authorization was audited against the target role model above and found to already
match it exactly — no route, middleware, or schema changes were made.

The frontend audit found that **Customer CRM was the one module that hadn't received the same
UX treatment as Products/Warehouses/Challans**: it had no `canWriteCustomers` helper, and its
list/detail/form pages showed Add/Edit/Add-Follow-up controls to every role unconditionally
(relying entirely on the backend to reject WAREHOUSE/ACCOUNTS writes with `403` after the fact).
This review added `canWriteCustomers(role)` and applied it consistently:

- `CustomerListPage` — "+ Add Customer" button and per-row "Edit" link now hidden unless `canWrite`.
- `CustomerDetailPage` — "Edit Customer" button and the entire "Add Follow-up" card now hidden unless `canWrite`.
- `CustomerFormPage` (`/customers/new`, `/customers/:id/edit`) — now redirects to `/customers` if `!canWrite`, matching the guard already present in `ProductFormPage`, `WarehouseFormPage`, and `ChallanFormPage`.

No other module required changes — Products, Warehouses, and Challans already gated every
write action correctly on both ends.
