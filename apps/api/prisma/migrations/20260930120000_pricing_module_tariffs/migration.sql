-- AlterTable
ALTER TABLE "cities" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "tariffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "carrier_code" VARCHAR(50) NOT NULL,
    "carrier_name" VARCHAR(150) NOT NULL,
    "origin_port_code" VARCHAR(20) NOT NULL,
    "origin_port_name" VARCHAR(150) NOT NULL,
    "destination_port_code" VARCHAR(20) NOT NULL,
    "destination_port_name" VARCHAR(150) NOT NULL,
    "container_type" VARCHAR(20) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "buy_rate" DECIMAL(14,2) NOT NULL,
    "sell_rate" DECIMAL(14,2) NOT NULL,
    "transit_days_estimated" INTEGER NOT NULL DEFAULT 25,
    "free_days_allowed" INTEGER NOT NULL DEFAULT 14,
    "valid_from" DATE,
    "valid_to" DATE,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_default_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "charge_item_id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "buy_rate" DECIMAL(12,2) NOT NULL,
    "sell_rate" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "item_default_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tariffs_company_id_category_idx" ON "tariffs"("company_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "item_default_rates_charge_item_id_key" ON "item_default_rates"("charge_item_id");

-- AddForeignKey
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_default_rates" ADD CONSTRAINT "item_default_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_default_rates" ADD CONSTRAINT "item_default_rates_charge_item_id_fkey" FOREIGN KEY ("charge_item_id") REFERENCES "charge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

