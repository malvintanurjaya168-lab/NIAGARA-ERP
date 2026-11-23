# TODO — NIAGARA ERP Phase 1

Last updated: 22 November 2026

## Completed

- [x] Authentication, session handling, logout, and route protection.
- [x] RBAC with `OWNER`, `MANAGER`, `INVENTORY_STAFF`, `CASHIER`, `FINANCE`.
- [x] Dashboard KPIs, sales chart, best sellers, low stock, recent sales.
- [x] Inventory product CRUD, categories, stock adjustments, product detail.
- [x] Global stock movement ledger with search, type filter, and pagination.
- [x] POS catalog, cart, stock validation, atomic checkout, idempotency.
- [x] Sales history, filters, detail, void with stock restoration.
- [x] Financial reports with COGS, gross profit, margins, fiscal periods.
- [x] User management, roles, activation, password reset, owner protection.
- [x] Company settings and fiscal year configuration.
- [x] Personal profile page with self-service password change for every role.
- [x] Unauthorized page and role-aware navigation.
- [x] Prisma schema, initial migration SQL, Supabase schema, and seed script.
- [x] Supabase database configured and schema applied.
- [x] Main seed executed and demo data confirmed.
- [x] Supplementary additive seed executed and verified idempotent.
- [x] Lint, TypeScript, and production build verification.

## Remaining Phase 1 work

### Live application verification

- [ ] Smoke test login for all five roles.
- [ ] Verify unauthorized-route behavior for each role.
- [ ] Verify POS checkout, stock decrement, idempotency, and overselling guard.
- [ ] Verify void flow, stock restoration, and `SALE_VOID` ledger entries.
- [ ] Verify inventory list, product detail, and global movement ledger.
- [ ] Verify financial report totals against SQL validation queries.

> The database is now configured and seeded. These checks require running the
> application against it and have not been started. Do not start Supabase
> deployment, RLS, or database auditing work yet.

### Before production

- [ ] Replace all demo accounts and demo passwords.
- [ ] Generate and store a production `AUTH_SECRET`.
- [ ] Review seed data removal and backup/restore procedure.
- [ ] Confirm server-side authorization on any newly added route or action.
- [ ] Add automated tests for checkout, void, and tenant isolation.

## Explicitly out of scope

Phase 2 features are not started:

- AI/forecasting/OCR.
- Import/export and advanced reporting.
- Payment gateway or accounting integrations.
- Multi-company membership.
- Supabase deployment, RLS, or database auditing.
