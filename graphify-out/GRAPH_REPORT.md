# Graph Report - Google Developer  (2026-11-22)

## Corpus Check
- 116 files · ~45,458 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 1, (none) 1, .bak 1)

## Summary
- 831 nodes · 2608 edges · 40 communities (38 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Button
- sidebar.tsx
- queries/inventory.ts
- inventory/page.tsx
- format.ts
- dashboard/page.tsx
- dependencies
- migration.sql
- sales/page.tsx
- actions/inventory.ts
- schema.sql
- devDependencies
- components.json
- inventory/[id]/page.tsx
- roles.ts
- package.json
- compilerOptions
- seed.ts
- users/page.tsx
- app/layout.tsx
- queries/sales.ts
- next
- settings/page.tsx
- topbar.tsx
- scripts
- actions/auth.ts
- SectionCard
- actions/users.ts
- auth-guards.ts
- tabs.tsx
- sales/[id]/page.tsx
- actions/sales.ts
- eslint.config.mjs
- profile/page.tsx
- proxy.ts
- loading.tsx
- pos/page.tsx
- { GET, POST }
- actions/settings.ts
- dotenv

## God Nodes (most connected - your core abstractions)
1. `Button()` - 56 edges
2. `next` - 44 edges
3. `lucide-react` - 41 edges
4. `react` - 39 edges
5. `SectionCard()` - 32 edges
6. `PageHeader()` - 29 edges
7. `requirePagePermission()` - 29 edges
8. `can()` - 28 edges
9. `Input()` - 27 edges
10. `DashboardPage()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `handleCheckout()` --indirect_call--> `paymentMethod()`  [INFERRED]
  src/components/pos/pos-terminal.tsx → prisma/seed.ts
- `LoginForm()` --indirect_call--> `loginAction()`  [INFERRED]
  src/app/login/login-form.tsx → src/lib/actions/auth.ts
- `DeleteCategoryButton()` --indirect_call--> `deleteCategoryAction()`  [INFERRED]
  src/components/inventory/category-manager.tsx → src/lib/actions/inventory.ts
- `StockAdjustDialog()` --indirect_call--> `adjustStockAction()`  [INFERRED]
  src/components/inventory/stock-adjust-dialog.tsx → src/lib/actions/inventory.ts
- `VoidSaleDialog()` --indirect_call--> `voidSaleAction()`  [INFERRED]
  src/components/sales/void-sale-dialog.tsx → src/lib/actions/sales.ts

## Import Cycles
- None detected.

## Communities (40 total, 2 thin omitted)

### Community 0 - "Button"
Cohesion: 0.07
Nodes (88): radix-ui@^1.8.1, cn, radix-ui, react, sonner, InventoryFilters(), MovementFilters(), ReportFilters() (+80 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.06
Nodes (45): ApplicationLayout(), dynamic, Logo(), LogoMark(), LogoMarkProps, LogoProps, AppShell(), AppShellProps (+37 more)

### Community 2 - "queries/inventory.ts"
Cohesion: 0.09
Nodes (24): CategoriesPage(), dynamic, metadata, InventoryFiltersProps, CategoryManager(), ProductFormProps, StockMovementFilter, CategoryOption (+16 more)

### Community 3 - "inventory/page.tsx"
Cohesion: 0.18
Nodes (17): lucide-react, EditProductPage(), metadata, metadata, NewProductPage(), dynamic, InventoryPage(), metadata (+9 more)

### Community 4 - "format.ts"
Cohesion: 0.05
Nodes (65): motion@^14.14.0, motion, dynamic, FinancialReportPage(), metadata, SearchParams, single(), ChartPoint (+57 more)

### Community 5 - "dashboard/page.tsx"
Cohesion: 0.19
Nodes (19): DashboardPage(), dynamic, greeting(), metadata, dynamic, metadata, SearchParams, single() (+11 more)

### Community 6 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, bcryptjs@^3.0.3, cn@^0.5.2, date-fns@^4.4.0, @hookform/resolvers@^7.0.8, lucide-react@^1.77.0, next@16.4.6, pg@^8.23.1 (+16 more)

### Community 7 - "migration.sql"
Cohesion: 0.15
Nodes (28): "categories", categories_company_id_is_active_idx, categories_company_id_name_key, "companies", "products", products_company_id_category_id_idx, products_company_id_is_active_idx, products_company_id_name_idx (+20 more)

### Community 8 - "sales/page.tsx"
Cohesion: 0.23
Nodes (10): dynamic, metadata, SalesPage(), SearchParams, single(), pageWindow(), Pagination(), PaginationProps (+2 more)

### Community 9 - "actions/inventory.ts"
Cohesion: 0.21
Nodes (21): adjustSchema, adjustStockAction(), assertCategory(), categorySchema, createCategoryAction(), createProductAction(), deleteCategoryAction(), handleActionError() (+13 more)

### Community 10 - "schema.sql"
Cohesion: 0.15
Nodes (28): "categories", categories_company_id_is_active_idx, categories_company_id_name_key, "companies", "products", products_company_id_category_id_idx, products_company_id_is_active_idx, products_company_id_name_idx (+20 more)

### Community 11 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, tsx@^4.23.15, @types/node@^20, @types/pg@^8.23.1, @types/react@^19, @types/react-dom@^19 (+9 more)

### Community 12 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "inventory/[id]/page.tsx"
Cohesion: 0.14
Nodes (20): dynamic, InfoRow(), metadata, ProductDetailPage(), StockBadge(), stockStatus(), Badge(), badgeVariants (+12 more)

### Community 14 - "roles.ts"
Cohesion: 0.12
Nodes (16): DEMO_ACCOUNTS, DemoAccount, ALL_PERMISSIONS, canAny(), isRole(), PERMISSIONS, Role, ROLE_DESCRIPTIONS (+8 more)

### Community 15 - "package.json"
Cohesion: 0.12
Nodes (16): clsx@^2.1.1, next-auth@^5.0.0-beta.32, @prisma/adapter-pg@^7.10.1, server-only@^0.0.1, shadcn@^4.23.0, tw-animate-css@^1.4.0, name, private (+8 more)

### Community 16 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 17 - "seed.ts"
Cohesion: 0.20
Nodes (15): addDaysKey(), CATEGORIES, cleanupDemoCompany(), DEMO_USERS, jakartaDayKey(), jakartaStart(), main(), paymentMethod() (+7 more)

### Community 18 - "users/page.tsx"
Cohesion: 0.15
Nodes (17): dynamic, metadata, UsersPage(), itemVariants, StaggerGroupProps, StaggerItemProps, EmptyState(), EmptyStateProps (+9 more)

### Community 19 - "app/layout.tsx"
Cohesion: 0.21
Nodes (10): next-themes@^0.4.6, next-themes, geistMono, metadata, plusJakarta, RootLayout(), viewport, Providers() (+2 more)

### Community 20 - "queries/sales.ts"
Cohesion: 0.20
Nodes (8): SalesFiltersProps, SALES_PAGE_SIZE, CashierOption, SaleDetail, SaleItemDetail, SaleRow, SalesListParams, SalesListResult

### Community 21 - "next"
Cohesion: 0.19
Nodes (13): nextConfig, next, metadata, UnauthorizedPage(), dynamic, highlights, LoginPage(), metadata (+5 more)

### Community 22 - "settings/page.tsx"
Cohesion: 0.36
Nodes (6): dynamic, InfoRow(), metadata, SettingsPage(), CompanySettings, getCompanySettings()

### Community 23 - "topbar.tsx"
Cohesion: 0.21
Nodes (9): LoginForm(), UserMenu(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuSeparator(), DropdownMenuTrigger() (+1 more)

### Community 24 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, db:baseline, db:generate, db:migrate, db:push, db:seed, db:studio (+5 more)

### Community 25 - "actions/auth.ts"
Cohesion: 0.38
Nodes (6): signIn, signOut, loginAction(), loginSchema, LoginState, logoutAction()

### Community 26 - "SectionCard"
Cohesion: 0.20
Nodes (9): AnimatedNumber(), MetricCard(), MetricCardProps, toneStyles, SectionCard(), SectionCardProps, Card(), CardContent() (+1 more)

### Community 27 - "actions/users.ts"
Cohesion: 0.20
Nodes (9): activeField, createSchema, emailField, nameField, passwordField, resetSchema, roleEnum, updateSchema (+1 more)

### Community 28 - "auth-guards.ts"
Cohesion: 0.23
Nodes (8): auth, credentialsSchema, handlers, CurrentUser, createPrismaClient(), getPrisma(), globalForPrisma, prisma

### Community 29 - "tabs.tsx"
Cohesion: 0.29
Nodes (4): class-variance-authority@^0.7.1, class-variance-authority, TabsList(), tabsListVariants

### Community 30 - "sales/[id]/page.tsx"
Cohesion: 0.23
Nodes (12): dynamic, InfoRow(), metadata, SaleDetailPage(), SummaryRow(), addProduct(), changeQuantity(), SaleStatusBadge() (+4 more)

### Community 31 - "actions/sales.ts"
Cohesion: 0.25
Nodes (8): zod@^4.6.7, zod, handleCheckout(), checkoutAction(), CheckoutResult, checkoutSchema, nextTransactionNumber(), voidSchema

### Community 32 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.6, eslint, eslint-config-next

### Community 33 - "profile/page.tsx"
Cohesion: 0.23
Nodes (7): dynamic, InfoRow(), metadata, ProfilePage(), Avatar(), AvatarFallback(), initials()

### Community 34 - "proxy.ts"
Cohesion: 0.40
Nodes (3): config, PUBLIC_PATHS, SESSION_COOKIE_NAMES

### Community 36 - "pos/page.tsx"
Cohesion: 0.32
Nodes (6): dynamic, metadata, PosPage(), CartLine, getPosCatalog(), PosProduct

### Community 38 - "actions/settings.ts"
Cohesion: 0.38
Nodes (5): changeOwnPasswordAction(), companySchema, passwordSchema, updateCompanyAction(), validationError()

### Community 39 - "dotenv"
Cohesion: 0.40
Nodes (4): dotenv@^18.0.10, prisma@^7.10.1, dotenv, prisma

## Knowledge Gaps
- **1 isolated node(s):** `{ GET, POST }`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 259 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `Button`, `sidebar.tsx`, `queries/inventory.ts`, `inventory/page.tsx`, `format.ts`, `dashboard/page.tsx`, `dependencies`, `sales/page.tsx`, `actions/inventory.ts`, `inventory/[id]/page.tsx`, `package.json`, `users/page.tsx`, `app/layout.tsx`, `settings/page.tsx`, `topbar.tsx`, `actions/users.ts`, `auth-guards.ts`, `sales/[id]/page.tsx`, `actions/sales.ts`, `profile/page.tsx`, `proxy.ts`, `pos/page.tsx`, `actions/settings.ts`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **What connects `{ GET, POST }` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.06738223017292785 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `inventory/page.tsx` to `Button`, `profile/page.tsx`, `queries/inventory.ts`, `sidebar.tsx`, `format.ts`, `dashboard/page.tsx`, `dependencies`, `sales/page.tsx`, `inventory/[id]/page.tsx`, `package.json`, `users/page.tsx`, `app/layout.tsx`, `next`, `settings/page.tsx`, `topbar.tsx`, `SectionCard`, `sales/[id]/page.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06346153846153846 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Button` to `sidebar.tsx`, `profile/page.tsx`, `format.ts`, `dashboard/page.tsx`, `dependencies`, `inventory/[id]/page.tsx`, `package.json`, `topbar.tsx`, `SectionCard`, `auth-guards.ts`, `tabs.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `queries/inventory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._