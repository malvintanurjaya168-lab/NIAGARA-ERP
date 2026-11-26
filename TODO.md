# TODO — NIAGARA ERP Phase 1

Last updated: 24 November 2026

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
- [x] COA database foundation: `AccountType` enum, `Account` model, additive
  migration `20261124000000_add_accounts`, and `supabase/schema.sql` update
  (schema only — migration not applied to the database).
- [x] COA backend: `accounts.view`/`accounts.manage` permissions,
  `src/lib/queries/accounts.ts`, `src/lib/actions/accounts.ts` (create,
  update, activate, deactivate) with hierarchy and tenant-isolation rules.
- [x] Vitest test suite (`npm test`) for COA permissions, isolation, and rules.
- [x] COA management UI at `/accounts`: hierarchy tree, filters, account
  create/edit dialogs, activate/deactivate actions.
- [x] Indonesian MSME COA template with preview and idempotent transactional
  apply action (`applyCoaTemplateAction`).
- [x] COA migration `20261124000000_add_accounts` applied to Supabase via
  `prisma migrate deploy`; schema verified up to date.
- [x] Live verification of `/accounts` for all five roles and write-path
  probes (create/duplicate/FK) against Supabase.
- [x] Multi-warehouse database foundation: `Warehouse`, `ProductStock`,
  `StockTransfer`, `StockTransferItem` models, `TransferStatus` enum,
  `TRANSFER_OUT`/`TRANSFER_IN` movement types, nullable warehouse/transfer
  references on sales and stock movements, additive migration
  `20261125000000_add_multi_warehouse` with deterministic backfill to a
  per-company `Gudang Utama` default warehouse (schema only — migration not
  applied to the database).

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

## Multi-warehouse remaining work

- [x] Apply migration `20261125000000_add_multi_warehouse` to Supabase via
  `prisma migrate deploy`; backfill verified live (default warehouse,
  `product_stocks` = `stock_quantity`, sales/movement `warehouse_id`).
- [x] Warehouse CRUD: queries/actions, RBAC permissions (`warehouses.view`/
  `warehouses.manage`), `/warehouses` UI with default-warehouse management.
- [x] Dual-write `ProductStock` + `products.stock_quantity` in checkout,
  void, stock adjustment, and product create paths (`src/lib/stock.ts`
  `applyStockDelta`; default warehouse used until POS picker lands).
- [x] Update seed scripts so new products receive default-warehouse
  `ProductStock` rows (`seed.ts`, `seed-supplemental.ts`).
- [x] POS warehouse selection: selector UI, `?gudang=` param, cart-clear
  confirmation, warehouse-scoped catalog stock, `checkoutAction`
  `warehouseId` validation, warehouse shown on sale detail/list.
- [ ] Warehouse-scoped stock views/reports.
- [ ] Stock-transfer module: transfer queries/actions and UI.

## Explicitly out of scope

Phase 2 features are not started:

- AI/forecasting/OCR.
- Import/export and advanced reporting.
- Payment gateway or accounting integrations.
- Multi-company membership.
- Supabase deployment, RLS, or database auditing.
