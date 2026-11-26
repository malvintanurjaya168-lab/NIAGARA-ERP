# PROJECT STATUS — NIAGARA ERP Phase 1

Last updated: 24 November 2026

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
| Production build | `npm run build` | Passed; 21 routes generated |
| Unit tests | `npm test` (vitest) | 44 tests passed |

Routes: `/`, `/login`, `/accounts`, `/dashboard`, `/inventory`, `/inventory/[id]`,
`/inventory/[id]/edit`, `/inventory/categories`, `/inventory/movements`,
`/inventory/new`, `/pos`, `/sales`, `/sales/[id]`, `/reports/financial`,
`/users`, `/settings`, `/profile`, `/unauthorized`, `/api/auth/[...nextauth]`,
`/_not-found`, `/icon.svg`.

## Chart of Accounts (Phase 2)

- **Migration applied (24 Nov 2026):** `20261124000000_add_accounts` deployed to
  Supabase via `prisma migrate deploy`. `accounts` table, `AccountType` enum,
  indexes, and composite parent FK verified live; existing data intact
  (1 company, 5 users, 47 products, 218 sales, 0 accounts).
- **Live verification (24 Nov 2026):** `/accounts` loads against Supabase for
  all five demo roles — OWNER sees manage controls, MANAGER/FINANCE view-only,
  INVENTORY_STAFF/CASHIER redirected to `/unauthorized`. Write path verified
  with a transient create/duplicate/delete probe (P2002/P2003 enforced);
  accounts table left empty. MSME template intentionally not applied.

- **Step 1 — database foundation (done):** `AccountType` enum and `Account`
  model in `prisma/schema.prisma`; additive migration
  `20261124000000_add_accounts`; `supabase/schema.sql` updated. Not applied.
- **Step 2 — backend (done):**
  - Permissions `accounts.view` / `accounts.manage` in `src/lib/roles.ts`
    (OWNER: both; MANAGER, FINANCE: view; others: none).
  - `src/lib/queries/accounts.ts`: company-scoped list (type/search/status
    filters), hierarchy tree, detail with children, children list, and parent
    options excluding self + descendants.
  - `src/lib/actions/accounts.ts`: create, update, activate, deactivate with
    Zod validation, `requireActionUser("accounts.manage")`, and business rules
    (unique code per company, same-company + same-type + non-postable parent,
    self-parent and circular-hierarchy prevention, no postable accounts with
    children, no type change with children, no deactivation with children).
  - Vitest test suite (`npm test`): 34 tests covering permissions, tenant
    isolation, CRUD, duplicates, hierarchy rules, and activation flows.
- **Step 3 — COA UI + template (done):**
  - Route `/accounts` ("Bagan Akun") with metric cards, searchable/filterable
    hierarchical tree (expand/collapse, type/status/search filters), and
    row actions for OWNER.
  - `AccountExplorer`, `AccountFormDialog` (create/edit wired to existing
    actions), and `TemplateDialog` (preview + confirmation) under
    `src/components/accounts/`; nav entry added (`accounts.view`).
  - Indonesian MSME starter template in `src/lib/accounts-template.ts`
    (35 accounts across Aset/Utang/Modal/Pendapatan/Beban) with
    `planCoaTemplate` (idempotent, conflict-safe) and
    `applyCoaTemplateAction` (transactional, never overwrites existing codes).
- **Pending:** financial-report integration (journal entries). The MSME COA
  template has been applied by the user through the `/accounts` UI.

## Multi-Warehouse (Phase 3)

- **Migration applied:** `20261125000000_add_multi_warehouse` deployed via
  `prisma migrate deploy`; schema up to date. Backfill verified live: 1
  `Gudang Utama` default warehouse, 47 `product_stocks` rows matching
  `products.stock_quantity`, all 218 sales and 606 stock movements attributed
  to the default warehouse. Existing data intact.
- **Step 2 — warehouse CRUD + UI (done):**
  - Permissions `warehouses.view` / `warehouses.manage` (OWNER+MANAGER:
    both; INVENTORY_STAFF: view; CASHIER/FINANCE: none).
  - `src/lib/queries/warehouses.ts` (list/stats/detail/default/options,
    company-scoped) and `src/lib/actions/warehouses.ts` (create, update,
    activate, deactivate, set-default) with Zod validation, unique-code
    enforcement, default-deactivation guard, and transactional default
    switching.
  - Route `/warehouses` ("Manajemen Gudang") with metric cards, search,
    status filter, and row actions; `WarehouseExplorer` +
    `WarehouseFormDialog` under `src/components/warehouses/`; nav entry added.
- **Step 1 — database foundation (done):**
  - `prisma/schema.prisma`: `Warehouse`, `ProductStock`, `StockTransfer`,
    `StockTransferItem` models; `TransferStatus` enum; `MovementType` extended
    with `TRANSFER_OUT`/`TRANSFER_IN`; nullable `warehouse_id` on `sales` and
    `stock_movements`, nullable `transfer_id` on `stock_movements`.
  - Additive migration `20261125000000_add_multi_warehouse` with deterministic
    backfill: one `Gudang Utama` default warehouse per company, one
    `ProductStock` row per product seeded from `stock_quantity`, and
    `warehouse_id` backfilled on existing sales and stock movements.
  - `ProductStock` is the authoritative per-warehouse balance;
    `products.stock_quantity` remains the company-wide total. All future
    stock writes must update both atomically.
  - Tenant isolation via composite FKs `(company_id, …)`; CHECK constraints
    for non-negative stock, positive transfer quantities, and distinct
    transfer warehouses; partial unique index for one active default
    warehouse per company.
  - `supabase/schema.sql` updated for fresh installs.
- **Step 3A — stock-write integration (done):**
  - `src/lib/stock.ts` `applyStockDelta`: atomic dual-write of
    `product_stocks` (per warehouse) + `products.stock_quantity` (company
    total) inside the caller's transaction, with conditional updates as the
    oversell guard and auto-create of missing balance rows.
  - `checkoutAction`: resolves the company default warehouse, stores
    `sale.warehouseId`, decrements `ProductStock` + total per line, writes
    `SALE` movements with `warehouseId`; idempotency via `clientRequestId`
    and P2002 retry preserved.
  - `voidSaleAction`: restores stock to `sale.warehouseId` (fallback:
    company default for legacy rows), writes `SALE_VOID` movements with
    `warehouseId`; repeated-void protection preserved.
  - `adjustStockAction`: optional `warehouseId` (default warehouse when
    omitted), validates same-company + active, warehouse-scoped
    previous/new quantities on the movement.
  - `createProductAction`: opening stock allocated to the default
    warehouse via `product_stocks` row + `STOCK_IN` movement.
  - `stock-adjust-dialog` gained a warehouse selector fed by
    `getProductWarehouseStocks`; product detail page passes options.
  - Seed scripts updated: default warehouse creation, `product_stocks`
    rows, warehouse-tagged movements/sales, cleanup order.
  - Invariant `SUM(product_stocks) = products.stock_quantity` verified
    live (0 mismatches) and rollback probe on Supabase passed.
- **Step 3B — POS warehouse selection (done):**
  - `getPosWarehouses`/`getPosCatalog` in `src/lib/queries/pos.ts` —
    active warehouses ordered default-first; catalog `stockQuantity` now
    comes from `product_stocks` for the selected warehouse (products with
    no balance row show 0).
  - `/pos` accepts `?gudang=<id>`; invalid/missing param falls back to the
    company default warehouse; catalog re-fetched server-side per switch.
  - `PosTerminal`: warehouse selector (code — name, "(Default)" marker),
    selected warehouse shown in the cart header, checkout sends
    `warehouseId`, and switching with a non-empty cart requires
    confirmation (cart cleared, stock reloaded).
  - `checkoutAction` accepts optional `warehouseId` (Zod uuid), validates
    same-company + active server-side, falls back to default warehouse;
    all Step 3A atomic guarantees preserved.
  - Sale detail shows warehouse name/code (`Gudang` info row); sales list
    gained a warehouse column (`code — name`, hidden below `lg`, `—` for
    legacy nulls).
- **Pending:** stock-transfer module, warehouse-scoped stock views/reports,
  FIFO/weighted-average costing.

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
