# PROJECT STATUS — NIAGARA ERP Phase 1

Last updated: 22 November 2026

## Overall status

**Phase 1 feature-complete; database seeded, live app validation pending.**

All website modules are implemented and the project passes type-checking and
production build. A Supabase database is configured, the schema is applied, and
both the main and supplementary demo seeds have been executed. The remaining
Phase 1 work is end-to-end application verification against that database.

## Completed modules

| Module | Status | Notes |
| --- | --- | --- |
| Authentication | Complete | Credentials login, bcrypt, JWT 12h, active-user check, logout, protected routes. |
| Authorization / RBAC | Complete | Five roles, server-side guards, company-scoped queries and actions. |
| Dashboard | Complete | KPIs, sales chart with period modes, best sellers, low stock, recent sales. |
| Inventory | Complete | Product CRUD, categories, stock adjustments, product detail, inventory value. |
| Stock movement ledger | Complete | Global `/inventory/movements` page with product search, type filter, pagination. |
| Point of Sale | Complete | Catalog, cart, stock validation, atomic checkout, idempotency, receipt dialog. |
| Sales | Complete | Filters, pagination, detail, role-scoped visibility, void with stock restore. |
| Financial reports | Complete | Revenue, COGS, gross profit, margins, payment mix, best products, fiscal periods. |
| User management | Complete | Create/edit users, roles, activation, password reset, owner protection. |
| Company settings | Complete | Company profile, fiscal year, owner-only administration. |
| Personal profile | Complete | `/profile` for every authenticated user with account info and own password change. |
| Unauthorized page | Complete | Clear access-denied state for restricted routes. |

## Recently completed in this session

- Added the global stock movement ledger and linked it from inventory and
  product detail.
- Fixed global search targets for new products and stock movements.
- Added `/profile` so every role can review account information and change its
  own password.
- Fixed the topbar “Pengaturan Perusahaan” link from the nonexistent
  `/settings/company` to `/settings`.
- Updated progress documentation (`PROJECT_STATUS.md`, `TODO.md`,
  `IMPLEMENTATION_REPORT.md`, `README.md`).

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Passed; one tooling warning in `.opencode/plugins/graphify.js` |
| TypeScript | `npx tsc --noEmit` | Passed |
| Production build | `npm run build` | Passed; 20 routes generated |

Routes: `/`, `/login`, `/dashboard`, `/inventory`, `/inventory/[id]`,
`/inventory/[id]/edit`, `/inventory/categories`, `/inventory/movements`,
`/inventory/new`, `/pos`, `/sales`, `/sales/[id]`, `/reports/financial`,
`/users`, `/settings`, `/profile`, `/unauthorized`, `/api/auth/[...nextauth]`,
`/_not-found`, `/icon.svg`.

## Blocked / not verified

- Supabase provisioning, migration execution, and seed execution.
- Login and RBAC smoke test with real users.
- POS checkout, idempotency, stock decrement, void, and ledger verification
  against PostgreSQL.
- Financial report totals compared with SQL validation queries.

These are blocked by missing `DATABASE_URL` / `DIRECT_URL` credentials and were
not started, per the instruction not to work on Supabase deployment or database
auditing.

## Known Phase 1 limitations

- Gross profit only; operating expenses are not recorded.
- No file import/export, thermal receipt printing, or payment gateway.
- One company per user account.
- Tenant isolation is enforced in the application; Supabase RLS is not enabled.
- No automated test suite yet; verification is lint, typecheck, build, and
  static review.
- Demo accounts and `AUTH_SECRET` must be replaced before production.

## Next

See [`TODO.md`](TODO.md).
