-- AlterTable
ALTER TABLE "charge_items" ADD COLUMN     "category_id" UUID,
ADD COLUMN     "show_in_commission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_disbursement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_operations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "overseas_agents" ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ports" ADD COLUMN     "port_type_id" UUID;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commercial_reg" VARCHAR(100),
ADD COLUMN     "cr_expiry" DATE,
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tax_card_expiry" DATE,
ADD COLUMN     "tax_card_number" VARCHAR(100),
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "name_en" VARCHAR(150) NOT NULL,
    "name_ar" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "port_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "port_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_line_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipping_line_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "country_code" VARCHAR(2),
    "phone" VARCHAR(50),
    "email" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_line_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_line_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipping_line_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(150),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_line_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "country_code" VARCHAR(2),
    "phone" VARCHAR(50),
    "email" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(150),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overseas_agent_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "overseas_agent_id" UUID NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "country_code" VARCHAR(2),
    "phone" VARCHAR(50),
    "email" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overseas_agent_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overseas_agent_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "overseas_agent_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(150),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overseas_agent_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cities_company_id_country_code_idx" ON "cities"("company_id", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "cities_company_id_country_code_name_en_key" ON "cities"("company_id", "country_code", "name_en");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_company_id_code_key" ON "measurement_units"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_categories_company_id_code_key" ON "logistics_categories"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "port_types_company_id_code_key" ON "port_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "shipping_line_branches_company_id_shipping_line_id_idx" ON "shipping_line_branches"("company_id", "shipping_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_line_branches_shipping_line_id_name_key" ON "shipping_line_branches"("shipping_line_id", "name");

-- CreateIndex
CREATE INDEX "shipping_line_contacts_company_id_shipping_line_id_idx" ON "shipping_line_contacts"("company_id", "shipping_line_id");

-- CreateIndex
CREATE INDEX "vendor_branches_company_id_vendor_id_idx" ON "vendor_branches"("company_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_branches_vendor_id_name_key" ON "vendor_branches"("vendor_id", "name");

-- CreateIndex
CREATE INDEX "vendor_contacts_company_id_vendor_id_idx" ON "vendor_contacts"("company_id", "vendor_id");

-- CreateIndex
CREATE INDEX "overseas_agent_branches_company_id_overseas_agent_id_idx" ON "overseas_agent_branches"("company_id", "overseas_agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "overseas_agent_branches_overseas_agent_id_name_key" ON "overseas_agent_branches"("overseas_agent_id", "name");

-- CreateIndex
CREATE INDEX "overseas_agent_contacts_company_id_overseas_agent_id_idx" ON "overseas_agent_contacts"("company_id", "overseas_agent_id");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_units" ADD CONSTRAINT "measurement_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_categories" ADD CONSTRAINT "logistics_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "port_types" ADD CONSTRAINT "port_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_port_type_id_fkey" FOREIGN KEY ("port_type_id") REFERENCES "port_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_line_branches" ADD CONSTRAINT "shipping_line_branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_line_branches" ADD CONSTRAINT "shipping_line_branches_shipping_line_id_fkey" FOREIGN KEY ("shipping_line_id") REFERENCES "shipping_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_line_contacts" ADD CONSTRAINT "shipping_line_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_line_contacts" ADD CONSTRAINT "shipping_line_contacts_shipping_line_id_fkey" FOREIGN KEY ("shipping_line_id") REFERENCES "shipping_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_line_contacts" ADD CONSTRAINT "shipping_line_contacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "shipping_line_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agent_branches" ADD CONSTRAINT "overseas_agent_branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agent_branches" ADD CONSTRAINT "overseas_agent_branches_overseas_agent_id_fkey" FOREIGN KEY ("overseas_agent_id") REFERENCES "overseas_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agent_contacts" ADD CONSTRAINT "overseas_agent_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agent_contacts" ADD CONSTRAINT "overseas_agent_contacts_overseas_agent_id_fkey" FOREIGN KEY ("overseas_agent_id") REFERENCES "overseas_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agent_contacts" ADD CONSTRAINT "overseas_agent_contacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "overseas_agent_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_items" ADD CONSTRAINT "charge_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "measurement_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_items" ADD CONSTRAINT "charge_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "logistics_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

