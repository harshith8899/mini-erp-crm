# Customer CRM

This document describes the Customer CRM module built on top of the existing authentication
and Prisma foundation. It covers customer fields, REST APIs, validation, search/filtering,
follow-ups, and authorization.

The underlying `Customer` and `CustomerFollowUp` Prisma models already existed in the database
foundation (`20260810000000_step2_database_foundation`) and fully covered the case study's
requirements, so **no schema changes were made** for this feature.

## Customer fields

| Field          | Type                                   | Required | Notes                                  |
|----------------|-----------------------------------------|----------|-----------------------------------------|
| `name`         | string (2–160 chars)                   | yes      | |
| `mobile`       | string (7–20 chars)                    | yes      | digits, spaces, `+`, `-`, `()` only |
| `email`        | string                                 | no       | validated format if supplied |
| `businessName` | string (≤160 chars)                    | no       | |
| `gstNumber`    | string (≤80 chars)                     | no       | |
| `customerType` | `RETAIL` \| `WHOLESALE` \| `DISTRIBUTOR` | yes    | |
| `address`      | string (≤500 chars)                    | no       | |
| `status`       | `LEAD` \| `ACTIVE` \| `INACTIVE`       | no       | defaults to `LEAD` |
| `followUpDate` | ISO date                               | no       | |
| `notes`        | string (≤5000 chars)                   | no       | |

`id`, `createdAt`, `updatedAt`, and `createdById` are system-managed and cannot be set or
changed by clients.

### Follow-up fields (`CustomerFollowUp`)

| Field          | Type     | Notes |
|----------------|----------|-------|
| `note`         | string (≤5000 chars), required | |
| `followUpDate` | ISO date | defaults to "now" if omitted |
| `customerId`   | set from the URL, not the body | |
| `createdById`  | set from the authenticated user | |

## REST APIs

All endpoints are mounted under `/api/customers` and require `Authorization: Bearer <token>`.

| Method | Path                              | Purpose                          |
|--------|------------------------------------|-----------------------------------|
| GET    | `/api/customers`                  | List customers (paginated/filterable) |
| POST   | `/api/customers`                  | Create a customer |
| GET    | `/api/customers/:id`               | Get a customer, including follow-up history |
| PATCH  | `/api/customers/:id`               | Update a customer |
| POST   | `/api/customers/:id/follow-ups`    | Add a follow-up note to a customer |

There is intentionally **no DELETE endpoint**. The case study does not require permanent
deletion, so customers are deactivated by setting `status` to `INACTIVE` via `PATCH` instead of
being destroyed — consistent with the existing schema, which has no soft-delete flag but does
have a `status` enum built for exactly this purpose.

### List customers

```
GET /api/customers?page=1&limit=10&search=abc&status=ACTIVE&type=WHOLESALE
```

- `page` (default `1`), `limit` (default `10`, max `100`).
- `search` matches (case-insensitive) against `name`, `businessName`, `mobile`, `email`.
- `status` — one of `LEAD`, `ACTIVE`, `INACTIVE`.
- `type` — one of `RETAIL`, `WHOLESALE`, `DISTRIBUTOR`.

Response:

```json
{
  "data": [ { "id": "...", "name": "...", "...": "..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

### Create customer

```
POST /api/customers
Content-Type: application/json

{
  "name": "Retail Co.",
  "mobile": "03001234567",
  "email": "retail@example.com",
  "businessName": "Retail Co.",
  "gstNumber": "GST10001",
  "customerType": "RETAIL",
  "address": "Main Market Street",
  "status": "ACTIVE",
  "followUpDate": "2026-09-01T00:00:00.000Z",
  "notes": "Preferred retail customer"
}
```

`201 Created` with the created customer, or `400 Bad Request` with `{ "error": "Validation failed", "details": [...] }`.

### Get customer detail

```
GET /api/customers/:id
```

Returns the customer plus `customerFollowUps` (most recent first, each including the creating
user's `id`, `name`, `email`, `role`). `404 Not Found` if the customer doesn't exist.

### Update customer

```
PATCH /api/customers/:id
Content-Type: application/json

{ "status": "ACTIVE", "notes": "Confirmed order for next month" }
```

Only supplied fields are validated and updated. Attempting to send `id`, `createdAt`,
`updatedAt`, or `createdById` returns `400 Bad Request`. Returns `200 OK` on success or
`404 Not Found` if the customer doesn't exist.

### Add follow-up

```
POST /api/customers/:id/follow-ups
Content-Type: application/json

{ "note": "Called customer, interested in bulk order", "followUpDate": "2026-09-05T10:00:00.000Z" }
```

`201 Created` with the created follow-up (including `createdBy`), or `404 Not Found` if the
customer doesn't exist. Adding a follow-up also updates the customer's headline `followUpDate`
to keep the list/detail view in sync with the latest scheduled follow-up.

## Validation

Validation lives in `backend/src/modules/customers/customers.validation.ts` (no external
validation library was introduced — the project's existing pattern, established in the auth
module, is hand-written validation functions returning `{ errors, data }`). It enforces:

- `name` required, 2–160 characters.
- `mobile` required, matches `^[0-9+\-\s()]{7,20}$`.
- `email` optional, must match a standard email pattern if supplied.
- `customerType` / `status` must be one of the enum values — arbitrary strings are rejected.
- `address` ≤500 chars, `notes` ≤5000 chars, `businessName`/`gstNumber` ≤160/80 chars.
- `followUpDate` must parse to a valid date if supplied.
- Pagination `page`/`limit` must be positive integers, `limit` capped at 100.
- Update requests reject any attempt to set `id`, `createdAt`, `updatedAt`, or `createdById`.

The frontend forms perform the same checks client-side for immediate feedback, but the backend
remains the source of truth — every request is re-validated server-side regardless of what the
UI already checked.

## Authentication & Authorization

Authentication reuses the existing `authenticate` middleware (JWT bearer token) unchanged — no
new auth logic was added. Role checks reuse the existing `requireRole(...roles)` middleware.

**Role assumptions (implementation decision — not specified by the case study):**

- `ADMIN` — full access: list/view/create/update customers, add follow-ups.
- `SALES` — full access, same as `ADMIN`. Sales owns the customer relationship day-to-day, so
  it needs to create and edit customers and log follow-ups.
- `WAREHOUSE`, `ACCOUNTS` — **read-only** (`GET` endpoints only). These roles may need customer
  context (e.g. to prepare a challan or invoice) but have no business reason to create or edit
  customer records or follow-ups, so write endpoints are conservatively restricted to `ADMIN`
  and `SALES`.

## Error handling

| Status | Meaning |
|--------|---------|
| 400 | Validation failed — body includes `{ error, details: string[] }` |
| 401 | Missing/invalid/expired JWT |
| 403 | Authenticated but role not permitted |
| 404 | Customer not found |
| 500 | Unexpected server error (no stack traces, SQL errors, or internals are ever returned) |

## Example requests

```bash
# List active wholesale customers, page 1
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/customers?status=ACTIVE&type=WHOLESALE&page=1&limit=10"

# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"City Traders","mobile":"03124567890","customerType":"RETAIL"}'

# Add a follow-up
curl -X POST http://localhost:3000/api/customers/<id>/follow-ups \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"note":"Discussed pricing, will confirm next week","followUpDate":"2026-09-10"}'
```

## Frontend

Built on the existing bare Vite/React/TS scaffold. `react-router-dom` was added (the project had
no router yet) to support multiple pages:

- `LoginPage` — signs in and stores the JWT (the scaffold had no login UI before this feature).
- `CustomerListPage` — search, status/type filters, pagination, loading/empty/error states.
- `CustomerDetailPage` — customer info, follow-up history, add-follow-up form.
- `CustomerFormPage` — shared add/edit form with client-side validation.

`src/lib/api.ts` centralizes the fetch wrapper (base URL from `VITE_API_BASE_URL`, attaches the
bearer token, normalizes errors) so no component hardcodes `localhost` URLs.
