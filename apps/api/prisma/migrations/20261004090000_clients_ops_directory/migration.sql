-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentCategory" ADD VALUE 'importer_registry';
ALTER TYPE "DocumentCategory" ADD VALUE 'exporter_registry';

-- AlterTable
ALTER TABLE "client_contacts" ADD COLUMN     "branch_id" UUID;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "city_id" UUID,
ADD COLUMN     "commercial_reg_expiry" DATE,
ADD COLUMN     "company_type_id" UUID,
ADD COLUMN     "converted_at" TIMESTAMPTZ,
ADD COLUMN     "converted_from_quotation_id" UUID,
ADD COLUMN     "country_code" VARCHAR(2),
ADD COLUMN     "email" VARCHAR(150),
ADD COLUMN     "importer_registry_expiry" DATE,
ADD COLUMN     "importer_registry_number" VARCHAR(100),
ADD COLUMN     "industry_sector_id" UUID,
ADD COLUMN     "name_ar" VARCHAR(255),
ADD COLUMN     "person_in_charge" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "tax_card_expiry" DATE,
ADD COLUMN     "tax_card_number" VARCHAR(100),
ADD COLUMN     "website" VARCHAR(255);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "clearance_port_id" UUID,
ADD COLUMN     "container_qty" DECIMAL(10,2),
ADD COLUMN     "container_type" VARCHAR(50),
ADD COLUMN     "goods_description" TEXT,
ADD COLUMN     "pdf_url" TEXT,
ADD COLUMN     "pickup_address_text" TEXT,
ADD COLUMN     "pickup_branch_id" UUID,
ADD COLUMN     "pricing_notes" TEXT,
ADD COLUMN     "service_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "special_requirements" TEXT,
ALTER COLUMN "incoterm" SET DEFAULT 'FOB';

-- CreateTable
CREATE TABLE "company_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "city_id" UUID,
    "country_code" VARCHAR(2),
    "phone" VARCHAR(50),
    "email" VARCHAR(150),
    "is_loading_address" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_types_company_id_code_key" ON "company_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "industry_sectors_company_id_code_key" ON "industry_sectors"("company_id", "code");

-- CreateIndex
CREATE INDEX "client_branches_company_id_client_id_idx" ON "client_branches"("company_id", "client_id");

-- CreateIndex
CREATE INDEX "client_branches_company_id_client_id_is_active_idx" ON "client_branches"("company_id", "client_id", "is_active");

-- CreateIndex
CREATE INDEX "client_contacts_company_id_client_id_idx" ON "client_contacts"("company_id", "client_id");

-- CreateIndex
CREATE INDEX "client_contacts_branch_id_idx" ON "client_contacts"("branch_id");

-- CreateIndex
CREATE INDEX "clients_company_id_status_idx" ON "clients"("company_id", "status");

-- CreateIndex
CREATE INDEX "clients_company_id_company_type_id_idx" ON "clients"("company_id", "company_type_id");

-- CreateIndex
CREATE INDEX "clients_company_id_industry_sector_id_idx" ON "clients"("company_id", "industry_sector_id");

-- AddForeignKey
ALTER TABLE "company_types" ADD CONSTRAINT "company_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_sectors" ADD CONSTRAINT "industry_sectors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_branches" ADD CONSTRAINT "client_branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_branches" ADD CONSTRAINT "client_branches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_branches" ADD CONSTRAINT "client_branches_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_type_id_fkey" FOREIGN KEY ("company_type_id") REFERENCES "company_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_industry_sector_id_fkey" FOREIGN KEY ("industry_sector_id") REFERENCES "industry_sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_converted_from_quotation_id_fkey" FOREIGN KEY ("converted_from_quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "client_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_clearance_port_id_fkey" FOREIGN KEY ("clearance_port_id") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_pickup_branch_id_fkey" FOREIGN KEY ("pickup_branch_id") REFERENCES "client_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

