CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR');
CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT');
CREATE TYPE "ChallanStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "customers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(160) NOT NULL,
  "mobile" VARCHAR(32) NOT NULL,
  "email" VARCHAR(255),
  "businessName" VARCHAR(160),
  "gstNumber" VARCHAR(80),
  "customerType" "CustomerType" NOT NULL,
  "address" TEXT,
  "status" "CustomerStatus" NOT NULL DEFAULT 'LEAD',
  "followUpDate" TIMESTAMPTZ,
  "notes" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_customers_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "customer_follow_ups" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "note" TEXT NOT NULL,
  "followUpDate" TIMESTAMPTZ NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_customer_follow_ups_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_customer_follow_ups_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "warehouses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL UNIQUE,
  "location" VARCHAR(160) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(160) NOT NULL,
  "sku" VARCHAR(80) NOT NULL UNIQUE,
  "category" VARCHAR(80),
  "unitPrice" NUMERIC(12,2) NOT NULL,
  "currentStock" INTEGER NOT NULL DEFAULT 0,
  "minimumStockAlert" INTEGER NOT NULL DEFAULT 0,
  "warehouseId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_products_warehouse" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "check_products_current_stock_non_negative" CHECK ("currentStock" >= 0)
);

CREATE TABLE "challans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "challanNumber" VARCHAR(80) NOT NULL UNIQUE,
  "customerId" UUID NOT NULL,
  "status" "ChallanStatus" NOT NULL,
  "totalQuantity" INTEGER NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "confirmedAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_challans_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_challans_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "stock_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "challanId" UUID,
  "quantity" INTEGER NOT NULL,
  "movementType" "MovementType" NOT NULL,
  "reason" VARCHAR(160) NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_stock_movements_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_stock_movements_challan" FOREIGN KEY ("challanId") REFERENCES "challans"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_stock_movements_creator" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "check_stock_movements_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "challan_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "challanId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "productNameSnapshot" VARCHAR(160) NOT NULL,
  "productSkuSnapshot" VARCHAR(80) NOT NULL,
  "unitPriceSnapshot" NUMERIC(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotal" NUMERIC(12,2) NOT NULL,
  CONSTRAINT "fk_challan_items_challan" FOREIGN KEY ("challanId") REFERENCES "challans"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_challan_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "check_challan_items_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "customer_gst_number_partial_unique"
  ON "customers" ("gstNumber")
  WHERE "gstNumber" IS NOT NULL;

CREATE INDEX "idx_customers_mobile" ON "customers" ("mobile");
CREATE INDEX "idx_customers_status" ON "customers" ("status");
CREATE INDEX "idx_customers_follow_up_date" ON "customers" ("followUpDate");
CREATE INDEX "idx_customers_customer_type" ON "customers" ("customerType");
CREATE INDEX "idx_customer_follow_ups_customer" ON "customer_follow_ups" ("customerId");
CREATE INDEX "idx_products_category" ON "products" ("category");
CREATE INDEX "idx_products_warehouse" ON "products" ("warehouseId");
CREATE INDEX "idx_stock_movements_product_created_at" ON "stock_movements" ("productId", "createdAt");
CREATE INDEX "idx_challans_customer" ON "challans" ("customerId");
CREATE INDEX "idx_challans_status" ON "challans" ("status");
CREATE INDEX "idx_challans_created_at" ON "challans" ("createdAt");
CREATE INDEX "idx_challan_items_challan" ON "challan_items" ("challanId");
CREATE INDEX "idx_challan_items_product" ON "challan_items" ("productId");
