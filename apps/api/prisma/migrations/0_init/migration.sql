-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'company_admin', 'sales_rep', 'pricing_officer', 'ops_officer', 'clearance_broker', 'accountant', 'client_portal', 'agent_portal');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('prospect', 'active', 'inactive', 'blacklisted');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('fcl', 'lcl', 'air', 'land', 'clearance_only');

-- CreateEnum
CREATE TYPE "IncotermType" AS ENUM ('EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ShipmentStage" AS ENUM ('booking_confirmed', 'cargo_received', 'customs_submitted', 'acid_issued', 'in_transit', 'arrived_destination', 'clearance_in_progress', 'release_issued', 'out_for_delivery', 'delivered', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('20GP', '40GP', '40HQ', '45HQ', '20RF', '40RF', 'FLAT_RACK', 'OPEN_TOP');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('booked', 'loaded', 'on_board', 'discharged', 'gated_out', 'delivered', 'returned_empty');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('client_freight', 'client_clearance', 'vendor_disbursement');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('trucking', 'clearance', 'port_services', 'warehousing', 'fumigation', 'inspection');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'note');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('bl', 'packing_list', 'commercial_invoice', 'acid_cert', 'cert_of_origin', 'eur1', 'customs_declaration', 'delivery_order', 'disbursement_receipt', 'other');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "commercial_registration" VARCHAR(100),
    "tax_number" VARCHAR(100),
    "phone" VARCHAR(50),
    "email" VARCHAR(150),
    "address" TEXT,
    "logo_url" TEXT,
    "currency_default" VARCHAR(3) NOT NULL DEFAULT 'EGP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "role" "UserRole" NOT NULL DEFAULT 'sales_rep',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255),
    "tax_number" VARCHAR(100),
    "commercial_reg" VARCHAR(100),
    "status" "ClientStatus" NOT NULL DEFAULT 'prospect',
    "sales_rep_id" UUID,
    "category" VARCHAR(100),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Egypt',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(150),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "code" VARCHAR(10) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "name_ar" VARCHAR(255),
    "country_code" VARCHAR(2) NOT NULL,
    "port_type" VARCHAR(20) NOT NULL DEFAULT 'sea',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scac" VARCHAR(10),
    "contact_name" VARCHAR(150),
    "contact_email" VARCHAR(150),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overseas_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "contact_person" VARCHAR(150),
    "contact_email" VARCHAR(150),
    "contact_phone" VARCHAR(50),
    "specialization" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overseas_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "vendor_type" "VendorType" NOT NULL,
    "tax_id" VARCHAR(50),
    "contact_name" VARCHAR(150),
    "contact_phone" VARCHAR(50),
    "contact_email" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "default_price" DECIMAL(12,2),
    "show_in_pricing" BOOLEAN NOT NULL DEFAULT true,
    "show_in_quotation" BOOLEAN NOT NULL DEFAULT true,
    "show_in_invoice" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "quotation_number" VARCHAR(50) NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "parent_quotation_id" UUID,
    "client_id" UUID NOT NULL,
    "sales_rep_id" UUID NOT NULL,
    "origin_port_id" UUID,
    "destination_port_id" UUID,
    "shipment_type" "ShipmentType" NOT NULL,
    "incoterm" "IncotermType" NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "valid_until" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_sell" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimated_transit_days" INTEGER,
    "terms_and_conditions" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "charge_item_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "cost_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'container',
    "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_sell" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profit_margin_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "show_in_client_quote" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "job_file_number" VARCHAR(50) NOT NULL,
    "quotation_id" UUID,
    "client_id" UUID NOT NULL,
    "sales_rep_id" UUID,
    "ops_officer_id" UUID,
    "shipping_line_id" UUID,
    "overseas_agent_id" UUID,
    "shipment_type" "ShipmentType" NOT NULL,
    "incoterm" "IncotermType" NOT NULL,
    "origin_port_id" UUID,
    "destination_port_id" UUID,
    "current_stage" "ShipmentStage" NOT NULL DEFAULT 'booking_confirmed',
    "bl_number" VARCHAR(100),
    "vessel_name" VARCHAR(150),
    "voyage_number" VARCHAR(50),
    "etd" DATE,
    "eta" DATE,
    "ata" DATE,
    "free_days_allowed" INTEGER NOT NULL DEFAULT 14,
    "cargo_description" TEXT,
    "gross_weight_kg" DECIMAL(12,2),
    "volume_cbm" DECIMAL(10,2),
    "package_count" INTEGER,
    "package_type" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_containers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "container_number" VARCHAR(20),
    "container_type" "ContainerType" NOT NULL,
    "seal_number" VARCHAR(50),
    "tare_weight_kg" DECIMAL(10,2),
    "cargo_weight_kg" DECIMAL(12,2),
    "status" "ContainerStatus" NOT NULL DEFAULT 'booked',
    "discharged_at" TIMESTAMPTZ,
    "empty_returned_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "from_stage" "ShipmentStage",
    "to_stage" "ShipmentStage" NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "notes" TEXT,
    "location" VARCHAR(255),
    "event_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "vendor_id" UUID,
    "charge_item_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "estimated_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_dossiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "acid_number" VARCHAR(19),
    "acid_issue_date" DATE,
    "acid_expiry_date" DATE,
    "customs_certificate_number" VARCHAR(50),
    "customs_broker_id" UUID,
    "customs_value_declared" DECIMAL(14,2),
    "duties_paid" DECIMAL(14,2),
    "vat_paid" DECIMAL(14,2),
    "inspection_date" DATE,
    "release_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'acid_requested',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customs_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "shipment_id" UUID,
    "client_id" UUID NOT NULL,
    "invoice_type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "issue_date" DATE,
    "due_date" DATE,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "charge_item_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "public_url" TEXT,
    "expiry_date" DATE,
    "ocr_extracted_text" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "due_at" TIMESTAMPTZ NOT NULL,
    "assigned_user_id" UUID NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(20) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" UUID NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "charge_items_company_id_code_key" ON "charge_items"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_company_id_quotation_number_version_number_key" ON "quotations"("company_id", "quotation_number", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_company_id_job_file_number_key" ON "shipments"("company_id", "job_file_number");

-- CreateIndex
CREATE UNIQUE INDEX "customs_dossiers_shipment_id_key" ON "customs_dossiers"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_invoice_number_key" ON "invoices"("company_id", "invoice_number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_lines" ADD CONSTRAINT "shipping_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overseas_agents" ADD CONSTRAINT "overseas_agents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_items" ADD CONSTRAINT "charge_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_destination_port_id_fkey" FOREIGN KEY ("destination_port_id") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_parent_quotation_id_fkey" FOREIGN KEY ("parent_quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_charge_item_id_fkey" FOREIGN KEY ("charge_item_id") REFERENCES "charge_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_ops_officer_id_fkey" FOREIGN KEY ("ops_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_line_id_fkey" FOREIGN KEY ("shipping_line_id") REFERENCES "shipping_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_overseas_agent_id_fkey" FOREIGN KEY ("overseas_agent_id") REFERENCES "overseas_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_port_id_fkey" FOREIGN KEY ("origin_port_id") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destination_port_id_fkey" FOREIGN KEY ("destination_port_id") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_containers" ADD CONSTRAINT "shipment_containers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_containers" ADD CONSTRAINT "shipment_containers_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_charge_item_id_fkey" FOREIGN KEY ("charge_item_id") REFERENCES "charge_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_dossiers" ADD CONSTRAINT "customs_dossiers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_dossiers" ADD CONSTRAINT "customs_dossiers_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_dossiers" ADD CONSTRAINT "customs_dossiers_customs_broker_id_fkey" FOREIGN KEY ("customs_broker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_charge_item_id_fkey" FOREIGN KEY ("charge_item_id") REFERENCES "charge_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

