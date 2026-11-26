-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

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

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_parent_id_fkey" FOREIGN KEY ("company_id", "parent_id") REFERENCES "accounts"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
