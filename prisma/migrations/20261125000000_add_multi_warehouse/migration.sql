-- ============================================================================
-- NIAGARA ERP - Multi-Warehouse foundation (additive)
-- ----------------------------------------------------------------------------
-- Adds warehouses, per-warehouse product stock balances, stock transfers,
-- and nullable warehouse/transfer references on sales and stock movements.
--
-- Backfill: every existing company receives one default warehouse
-- ("Gudang Utama"), every product receives a ProductStock row in that
-- warehouse seeded from products.stock_quantity, and existing sales and
-- stock movements are attributed to the default warehouse. Historical
-- quantities are interpreted as default-warehouse quantities because all
-- prior inventory belonged to a single logical warehouse.
--
-- products.stock_quantity remains the company-wide total for backward
-- compatibility; ProductStock is the authoritative per-warehouse balance.
-- Future write paths must update both atomically.
-- ============================================================================

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER_IN';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "warehouse_id" UUID;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "transfer_id" UUID,
ADD COLUMN     "warehouse_id" UUID;

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

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouses_company_id_is_active_idx" ON "warehouses"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "warehouses_company_id_is_default_idx" ON "warehouses"("company_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_id_id_key" ON "warehouses"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_id_code_key" ON "warehouses"("company_id", "code");

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

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_id_key" ON "products"("company_id", "id");

-- ============================================================================
-- Backfill (one-time, deterministic)
-- ============================================================================

-- 1. One default warehouse per existing company. Deterministic UUID derived
--    from the company id so the backfill is stable and idempotent-looking.
INSERT INTO "warehouses" ("id", "company_id", "code", "name", "address", "is_active", "is_default", "created_at", "updated_at")
SELECT md5('niagara-default-warehouse-' || c."id"::text)::uuid,
       c."id",
       'DEFAULT',
       'Gudang Utama',
       NULL,
       true,
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "companies" c;

-- 2. One ProductStock row per existing product, seeded from the current
--    company-wide stock_quantity into the company's default warehouse.
INSERT INTO "product_stocks" ("id", "company_id", "product_id", "warehouse_id", "quantity", "created_at", "updated_at")
SELECT md5('niagara-product-stock-' || p."id"::text || '-' || w."id"::text)::uuid,
       p."company_id",
       p."id",
       w."id",
       p."stock_quantity",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "products" p
JOIN "warehouses" w
  ON w."company_id" = p."company_id"
 AND w."is_default" = true;

-- 3. Attribute existing sales to the company's default warehouse.
UPDATE "sales" s
SET "warehouse_id" = w."id"
FROM "warehouses" w
WHERE w."company_id" = s."company_id"
  AND w."is_default" = true
  AND s."warehouse_id" IS NULL;

-- 4. Attribute existing stock movements to the company's default warehouse.
UPDATE "stock_movements" m
SET "warehouse_id" = w."id"
FROM "warehouses" w
WHERE w."company_id" = m."company_id"
  AND w."is_default" = true
  AND m."warehouse_id" IS NULL;

-- ============================================================================
-- Constraints not expressible in Prisma schema
-- ============================================================================

-- At most one active default warehouse per company.
CREATE UNIQUE INDEX "warehouses_one_default_per_company"
    ON "warehouses"("company_id")
    WHERE "is_default" = true AND "is_active" = true;

-- Non-negative per-warehouse stock balance.
ALTER TABLE "product_stocks"
    ADD CONSTRAINT "product_stocks_quantity_nonnegative" CHECK ("quantity" >= 0);

-- Transfer item quantities must be positive.
ALTER TABLE "stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_quantity_positive" CHECK ("quantity" > 0);

-- Source and destination warehouses must differ.
ALTER TABLE "stock_transfers"
    ADD CONSTRAINT "stock_transfers_distinct_warehouses" CHECK ("from_warehouse_id" <> "to_warehouse_id");

-- ============================================================================
-- Foreign keys
-- ============================================================================

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
