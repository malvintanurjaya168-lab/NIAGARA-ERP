-- ============================================================================
-- NIAGARA ERP — Phase 1 database schema (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Jalankan seluruh file ini di Supabase SQL Editor pada project kosong.
-- File ini mencakup prisma/migrations/0_init/migration.sql beserta migrasi
-- additive COA (prisma/migrations/20261124000000_add_accounts) dan multi-warehouse
-- (prisma/migrations/20261125000000_add_multi_warehouse), dan membuat
-- seluruh enum, tabel, relasi, unique constraint, serta index yang dibutuhkan.
--
-- Aplikasi mengakses database hanya dari server (Prisma + connection string).
-- Isolasi multi-tenant ditegakkan di lapisan data melalui company_id.
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'INVENTORY_STAFF', 'CASHIER', 'FINANCE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'QRIS', 'CARD', 'E_WALLET');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE', 'SALE_VOID', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" TEXT,
    "address" TEXT,
    "contact_email" TEXT,
    "phone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "fiscal_year_start_month" SMALLINT NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category_id" UUID,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchase_price" DECIMAL(18,2) NOT NULL,
    "selling_price" DECIMAL(18,2) NOT NULL,
    "stock_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "cashier_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "total_amount" DECIMAL(18,2) NOT NULL,
    "sold_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMPTZ(6),
    "voided_by_id" UUID,
    "void_reason" TEXT,
    "client_request_id" TEXT,
    "warehouse_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "unit_snapshot" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "selling_price_snapshot" DECIMAL(18,2) NOT NULL,
    "purchase_cost_snapshot" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity_delta" DECIMAL(18,3) NOT NULL,
    "previous_quantity" DECIMAL(18,3) NOT NULL,
    "new_quantity" DECIMAL(18,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "warehouse_id" UUID,
    "transfer_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parent_id" UUID,
    "is_postable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_stocks" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_stocks_quantity_nonnegative" CHECK ("quantity" >= 0)
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_transfers_distinct_warehouses" CHECK ("from_warehouse_id" <> "to_warehouse_id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_transfer_items_quantity_positive" CHECK ("quantity" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_role_idx" ON "users"("company_id", "role");

-- CreateIndex
CREATE INDEX "users_company_id_is_active_idx" ON "users"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "categories_company_id_is_active_idx" ON "categories"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_company_id_name_key" ON "categories"("company_id", "name");

-- CreateIndex
CREATE INDEX "products_company_id_is_active_idx" ON "products"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "products_company_id_category_id_idx" ON "products"("company_id", "category_id");

-- CreateIndex
CREATE INDEX "products_company_id_name_idx" ON "products"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_sku_key" ON "products"("company_id", "sku");

-- CreateIndex
CREATE INDEX "sales_company_id_sold_at_idx" ON "sales"("company_id", "sold_at");

-- CreateIndex
CREATE INDEX "sales_company_id_status_idx" ON "sales"("company_id", "status");

-- CreateIndex
CREATE INDEX "sales_cashier_id_idx" ON "sales"("cashier_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_company_id_transaction_number_key" ON "sales"("company_id", "transaction_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_company_id_client_request_id_key" ON "sales"("company_id", "client_request_id");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_company_id_created_at_idx" ON "stock_movements"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_company_id_movement_type_idx" ON "stock_movements"("company_id", "movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_company_id_reference_type_reference_id_idx" ON "stock_movements"("company_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "accounts_company_id_type_idx" ON "accounts"("company_id", "type");

-- CreateIndex
CREATE INDEX "accounts_company_id_parent_id_idx" ON "accounts"("company_id", "parent_id");

-- CreateIndex
CREATE INDEX "accounts_company_id_is_active_idx" ON "accounts"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_company_id_id_key" ON "accounts"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_company_id_code_key" ON "accounts"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_id_key" ON "products"("company_id", "id");

-- CreateIndex
CREATE INDEX "warehouses_company_id_is_active_idx" ON "warehouses"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "warehouses_company_id_is_default_idx" ON "warehouses"("company_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_id_id_key" ON "warehouses"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_id_code_key" ON "warehouses"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_one_default_per_company" ON "warehouses"("company_id") WHERE "is_default" = true AND "is_active" = true;

-- CreateIndex
CREATE INDEX "product_stocks_company_id_warehouse_id_idx" ON "product_stocks"("company_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "product_stocks_company_id_product_id_idx" ON "product_stocks"("company_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_company_id_product_id_warehouse_id_key" ON "product_stocks"("company_id", "product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_company_id_status_idx" ON "stock_transfers"("company_id", "status");

-- CreateIndex
CREATE INDEX "stock_transfers_company_id_created_at_idx" ON "stock_transfers"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_company_id_id_key" ON "stock_transfers"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_company_id_transfer_number_key" ON "stock_transfers"("company_id", "transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfer_items_company_id_product_id_idx" ON "stock_transfer_items"("company_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_items_transfer_id_product_id_key" ON "stock_transfer_items"("transfer_id", "product_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_parent_id_fkey" FOREIGN KEY ("company_id", "parent_id") REFERENCES "accounts"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_company_id_warehouse_id_fkey" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_warehouse_id_fkey" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_transfer_id_fkey" FOREIGN KEY ("company_id", "transfer_id") REFERENCES "stock_transfers"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_company_id_product_id_fkey" FOREIGN KEY ("company_id", "product_id") REFERENCES "products"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_company_id_warehouse_id_fkey" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_company_id_from_warehouse_id_fkey" FOREIGN KEY ("company_id", "from_warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_company_id_to_warehouse_id_fkey" FOREIGN KEY ("company_id", "to_warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_company_id_transfer_id_fkey" FOREIGN KEY ("company_id", "transfer_id") REFERENCES "stock_transfers"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_company_id_product_id_fkey" FOREIGN KEY ("company_id", "product_id") REFERENCES "products"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
