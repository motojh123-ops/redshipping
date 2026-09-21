-- ============================================================================
-- BANNA ERP / CRM — POSTGRESQL 16 INITIALIZATION SCRIPT (ARCHITECTURE V3)
-- Automatically executed on first container start.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TENANT RESOLUTION HELPER FUNCTION
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin', 'company_admin', 'sales_rep', 'pricing_officer', 
        'ops_officer', 'clearance_broker', 'accountant', 'client_portal', 'agent_portal'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('prospect', 'active', 'inactive', 'blacklisted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE shipment_type AS ENUM ('fcl', 'lcl', 'air', 'land', 'clearance_only');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incoterm_type AS ENUM ('EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE shipment_stage AS ENUM (
        'booking_confirmed', 'cargo_received', 'customs_submitted', 'acid_issued',
        'in_transit', 'arrived_destination', 'clearance_in_progress', 'release_issued',
        'out_for_delivery', 'delivered', 'closed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE container_type AS ENUM ('20GP', '40GP', '40HQ', '45HQ', '20RF', '40RF', 'FLAT_RACK', 'OPEN_TOP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE container_status AS ENUM ('booked', 'loaded', 'on_board', 'discharged', 'gated_out', 'delivered', 'returned_empty');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('client_freight', 'client_clearance', 'vendor_disbursement');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE vendor_type AS ENUM ('trucking', 'clearance', 'port_services', 'warehousing', 'fumigation', 'inspection');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('call', 'whatsapp', 'email', 'meeting', 'note');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'bl', 'packing_list', 'commercial_invoice', 'acid_cert', 'cert_of_origin', 
        'eur1', 'customs_declaration', 'delivery_order', 'disbursement_receipt', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- TABLE 1: COMPANIES (Tenant Root)
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    commercial_registration VARCHAR(100),
    tax_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    logo_url TEXT,
    currency_default VARCHAR(3) DEFAULT 'EGP',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'sales_rep',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 3: CLIENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tax_number VARCHAR(100),
    commercial_reg VARCHAR(100),
    status client_status DEFAULT 'prospect',
    sales_rep_id UUID REFERENCES users(id),
    category VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Egypt',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
CREATE POLICY clients_tenant_isolation ON clients FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients(company_id, status);

-- ============================================================================
-- TABLE 4: CLIENT CONTACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(150),
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_contacts_tenant_isolation ON client_contacts;
CREATE POLICY client_contacts_tenant_isolation ON client_contacts FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 5: PORTS (Shared Global + Company-Specific)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL, -- UN/LOCODE, e.g., EGALY, CNSHA
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    country_code VARCHAR(2) NOT NULL,
    port_type VARCHAR(20) DEFAULT 'sea',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ports_tenant_isolation ON ports;
CREATE POLICY ports_tenant_isolation ON ports FOR ALL USING (company_id IS NULL OR company_id = current_tenant_id());

-- ============================================================================
-- TABLE 6: SHIPPING LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    scac VARCHAR(10),
    contact_name VARCHAR(150),
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipping_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipping_lines_tenant_isolation ON shipping_lines;
CREATE POLICY shipping_lines_tenant_isolation ON shipping_lines FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 7: OVERSEAS AGENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS overseas_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    city VARCHAR(100) NOT NULL,
    contact_person VARCHAR(150),
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    specialization VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE overseas_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS overseas_agents_tenant_isolation ON overseas_agents;
CREATE POLICY overseas_agents_tenant_isolation ON overseas_agents FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 8: VENDORS
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vendor_type vendor_type NOT NULL,
    tax_id VARCHAR(50),
    contact_name VARCHAR(150),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendors_tenant_isolation ON vendors;
CREATE POLICY vendors_tenant_isolation ON vendors FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 9: CHARGE ITEMS (البنود)
-- ============================================================================
CREATE TABLE IF NOT EXISTS charge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_price NUMERIC(12, 2),
    show_in_pricing BOOLEAN DEFAULT true,
    show_in_quotation BOOLEAN DEFAULT true,
    show_in_invoice BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);
ALTER TABLE charge_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS charge_items_tenant_isolation ON charge_items;
CREATE POLICY charge_items_tenant_isolation ON charge_items FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 10: QUOTATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quotation_number VARCHAR(50) NOT NULL,
    version_number INT DEFAULT 1,
    parent_quotation_id UUID REFERENCES quotations(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    sales_rep_id UUID NOT NULL REFERENCES users(id),
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    shipment_type shipment_type NOT NULL,
    incoterm incoterm_type NOT NULL,
    status quotation_status DEFAULT 'draft',
    valid_until DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    total_cost NUMERIC(14, 2) DEFAULT 0,
    total_sell NUMERIC(14, 2) DEFAULT 0,
    total_profit NUMERIC(14, 2) DEFAULT 0,
    estimated_transit_days INT,
    terms_and_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, quotation_number, version_number)
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotations_tenant_isolation ON quotations;
CREATE POLICY quotations_tenant_isolation ON quotations FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_client ON quotations(company_id, client_id);

-- ============================================================================
-- TABLE 11: QUOTATION ITEMS (with company_id + RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    charge_item_id UUID REFERENCES charge_items(id),
    description VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    cost_rate NUMERIC(12, 2) DEFAULT 0,
    sell_rate NUMERIC(12, 2) DEFAULT 0,
    quantity NUMERIC(10, 2) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'container',
    total_cost NUMERIC(14, 2) DEFAULT 0,
    total_sell NUMERIC(14, 2) DEFAULT 0,
    profit NUMERIC(14, 2) DEFAULT 0,
    profit_margin_percent NUMERIC(5, 2) DEFAULT 0,
    show_in_client_quote BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotation_items_tenant_isolation ON quotation_items;
CREATE POLICY quotation_items_tenant_isolation ON quotation_items FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant ON quotation_items(company_id, quotation_id);

-- ============================================================================
-- TABLE 12: SHIPMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_file_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    sales_rep_id UUID REFERENCES users(id),
    ops_officer_id UUID REFERENCES users(id),
    shipping_line_id UUID REFERENCES shipping_lines(id),
    overseas_agent_id UUID REFERENCES overseas_agents(id),
    shipment_type shipment_type NOT NULL,
    incoterm incoterm_type NOT NULL,
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    current_stage shipment_stage DEFAULT 'booking_confirmed',
    bl_number VARCHAR(100),
    vessel_name VARCHAR(150),
    voyage_number VARCHAR(50),
    etd DATE,
    eta DATE,
    ata DATE,
    free_days_allowed INT DEFAULT 14,
    cargo_description TEXT,
    gross_weight_kg NUMERIC(12, 2),
    volume_cbm NUMERIC(10, 2),
    package_count INT,
    package_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, job_file_number)
);
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipments_tenant_isolation ON shipments;
CREATE POLICY shipments_tenant_isolation ON shipments FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_stage ON shipments(company_id, current_stage);

-- ============================================================================
-- TABLE 13: SHIPMENT CONTAINERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipment_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    container_number VARCHAR(20),
    container_type container_type NOT NULL,
    seal_number VARCHAR(50),
    tare_weight_kg NUMERIC(10, 2),
    cargo_weight_kg NUMERIC(12, 2),
    status container_status DEFAULT 'booked',
    discharged_at TIMESTAMPTZ,
    empty_returned_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipment_containers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipment_containers_tenant_isolation ON shipment_containers;
CREATE POLICY shipment_containers_tenant_isolation ON shipment_containers FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_containers_tenant_shipment ON shipment_containers(company_id, shipment_id);

-- ============================================================================
-- TABLE 14: SHIPMENT EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    from_stage shipment_stage,
    to_stage shipment_stage NOT NULL,
    changed_by_id UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    location VARCHAR(255),
    event_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipment_events_tenant_isolation ON shipment_events;
CREATE POLICY shipment_events_tenant_isolation ON shipment_events FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 15: SHIPMENT COSTS (Job Costing & P&L)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipment_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id),
    charge_item_id UUID REFERENCES charge_items(id),
    description VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    estimated_cost NUMERIC(12, 2) DEFAULT 0,
    actual_cost NUMERIC(12, 2) DEFAULT 0,
    is_reconciled BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipment_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipment_costs_tenant_isolation ON shipment_costs;
CREATE POLICY shipment_costs_tenant_isolation ON shipment_costs FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 16: CUSTOMS DOSSIERS (NAFEZA ACID & Clearance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customs_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
    acid_number VARCHAR(19),
    acid_issue_date DATE,
    acid_expiry_date DATE,
    customs_certificate_number VARCHAR(50),
    customs_broker_id UUID REFERENCES users(id),
    customs_value_declared NUMERIC(14, 2),
    duties_paid NUMERIC(14, 2),
    vat_paid NUMERIC(14, 2),
    inspection_date DATE,
    release_date DATE,
    status VARCHAR(50) DEFAULT 'acid_requested',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customs_dossiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customs_dossiers_tenant_isolation ON customs_dossiers;
CREATE POLICY customs_dossiers_tenant_isolation ON customs_dossiers FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 17: INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    shipment_id UUID REFERENCES shipments(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    invoice_type invoice_type NOT NULL,
    status invoice_status DEFAULT 'draft',
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    subtotal NUMERIC(14, 2) DEFAULT 0,
    tax_amount NUMERIC(14, 2) DEFAULT 0,
    total NUMERIC(14, 2) DEFAULT 0,
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    created_by_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices FOR ALL USING (company_id = current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_client ON invoices(company_id, client_id);

-- ============================================================================
-- TABLE 18: INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    charge_item_id UUID REFERENCES charge_items(id),
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1,
    unit_price NUMERIC(12, 2) DEFAULT 0,
    total_price NUMERIC(14, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_items_tenant_isolation ON invoice_items;
CREATE POLICY invoice_items_tenant_isolation ON invoice_items FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 19: CRM ACTIVITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type activity_type NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_activities_tenant_isolation ON crm_activities;
CREATE POLICY crm_activities_tenant_isolation ON crm_activities FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- TABLE 20: DOCUMENTS & REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS entity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    category document_category NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_key TEXT NOT NULL,
    public_url TEXT,
    expiry_date DATE,
    ocr_extracted_text TEXT,
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entity_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS entity_documents_tenant_isolation ON entity_documents;
CREATE POLICY entity_documents_tenant_isolation ON entity_documents FOR ALL USING (company_id = current_tenant_id());

CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    due_at TIMESTAMPTZ NOT NULL,
    assigned_user_id UUID NOT NULL REFERENCES users(id),
    is_completed BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_reminders_tenant_isolation ON scheduled_reminders;
CREATE POLICY scheduled_reminders_tenant_isolation ON scheduled_reminders FOR ALL USING (company_id = current_tenant_id());

-- ============================================================================
-- AUDIT LOGS (Partitioned & Append-Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL,
    company_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(20) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_logs_2026_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_q2 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_q3 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_q4 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_read ON audit_logs;
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT USING (company_id = current_tenant_id());
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- INITIAL SEED: GLOBAL MASTER DATA & DEMO COMPANY
-- ============================================================================
-- Global Egyptian Ports
INSERT INTO ports (code, name_en, name_ar, country_code, port_type) VALUES
('EGALY', 'Port of Alexandria', 'ميناء الإسكندرية', 'EG', 'sea'),
('EGPSD', 'Port Said West', 'ميناء غرب بورسعيد', 'EG', 'sea'),
('EGPSE', 'Port Said East', 'ميناء شرق بورسعيد', 'EG', 'sea'),
('EGDAM', 'Damietta Port', 'ميناء دمياط', 'EG', 'sea'),
('EGSOK', 'Sokhna Port', 'ميناء السخنة', 'EG', 'sea'),
('EGAXB', 'Borg El Arab Dry Port', 'ميناء برج العرب الجاف', 'EG', 'dry'),
('EG6OC', '6th of October Dry Port', 'ميناء 6 أكتوبر الجاف', 'EG', 'dry')
ON CONFLICT DO NOTHING;

-- Global International Ports
INSERT INTO ports (code, name_en, name_ar, country_code, port_type) VALUES
('CNSHA', 'Shanghai Port', 'ميناء شنغهاي', 'CN', 'sea'),
('CNNGB', 'Ningbo-Zhoushan', 'ميناء نينغبو', 'CN', 'sea'),
('AEJEA', 'Jebel Ali Port', 'ميناء جبل علي', 'AE', 'sea'),
('NLRTM', 'Rotterdam Port', 'ميناء روتردام', 'NL', 'sea'),
('DEHAM', 'Hamburg Port', 'ميناء هامبورغ', 'DE', 'sea'),
('ITGOA', 'Genoa Port', 'ميناء جنوة', 'IT', 'sea'),
('TRIST', 'Istanbul Port', 'ميناء اسطنبول', 'TR', 'sea'),
('INNSA', 'Nhava Sheva (JNP)', 'ميناء نهافا شيفا', 'IN', 'sea')
ON CONFLICT DO NOTHING;
