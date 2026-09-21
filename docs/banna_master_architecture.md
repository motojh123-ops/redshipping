# 🚢 BANNA — Freight Forwarding & Customs Clearance ERP / CRM
## Comprehensive Technical Architecture & Engineering Blueprint

> **Role**: Senior Software Architect & Lead Systems Engineer  
> **Target Industry**: Freight Forwarding, Customs Clearance (تخليص جمركي), Inland Haulage (نقل بري), and Multi-Modal Logistics (MENA / Egypt / International).  
> **Source Material**: 20-Minute Deep-Dive Domain Briefing (`Banna app-enhanced-v2.mp3`).

---

## 📑 TABLE OF CONTENTS
1. [Product Requirements & Domain Breakdown](#1-product-requirements--domain-breakdown)
2. [End-to-End User Flows & Hand-Offs](#2-end-to-end-user-flows--hand-offs)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture (React + Vite Multi-Tab Workspace)](#4-frontend-architecture)
5. [Backend Architecture (NestJS Clean Modular Monolith)](#5-backend-architecture)
6. [Database Schema (PostgreSQL 16 with Native RLS)](#6-database-schema)
7. [API Architecture & Service Contracts](#7-api-architecture--service-contracts)
8. [Authentication & Granular RBAC / ABAC](#8-authentication--granular-rbac--abac)
9. [File & Document Storage Architecture](#9-file--document-storage-architecture)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [AI & Automated Document Processing Architecture](#11-ai--automated-document-processing-architecture)
12. [Scalability & High-Throughput Strategy](#12-scalability--high-throughput-strategy)
13. [Security, Compliance & Audit Immutability](#13-security-compliance--audit-immutability)
14. [Caching & State Invalidation Strategy](#14-caching--state-invalidation-strategy)
15. [Queues, Asynchronous Workflows & Scheduled Jobs](#15-queues-asynchronous-workflows--scheduled-jobs)
16. [Deployment & Infrastructure Topology](#16-deployment--infrastructure-topology)
17. [Complete Project & Monorepo Directory Structure](#17-complete-project--monorepo-directory-structure)
18. [Technology Choices, Trade-Offs & Alternatives Matrix](#18-technology-choices-trade-offs--alternatives-matrix)
19. [MVP Scope vs. Future Vision](#19-mvp-scope-vs-future-vision)
20. [Implementation Roadmap (Sprint-by-Sprint)](#20-implementation-roadmap)

---

## 1. Product Requirements & Domain Breakdown

Based directly on the 20-minute Egyptian logistics domain briefing, the application consists of **6 distinct operational portals / workspaces** connected through a centralized state engine:

### 1.1 The User Roles & Portals

| Portal / Workspace | Primary Actors | Key Responsibilities & Capabilities |
|---|---|---|
| **1. CRM & Sales Portal** | Sales Representatives, Sales Managers | Manage Quick Leads (Prospects), convert to Actual Clients, schedule meetings, log calls/WhatsApp, request pricing quotes, track sent Offers. Filtered strictly to "My Clients / My Leads" unless manager. |
| **2. Pricing Desk (مكتب التسعير)** | Pricing Specialists, Trade Managers | Receive Quote Requests from Sales, query Shipping Line tariffs & inland haulage costs, configure line items (البنود), calculate margins, issue formal Offers back to Sales. |
| **3. Operations Hub (إدارة العمليات)** | Operations Executives, Documentation Officers | The core execution engine (represents 80%+ of daily workload). Handle confirmed bookings, Bill of Lading (B/L) issuance, container tracking (20GP, 40HQ, Flat Rack, Reefer), route milestones, Overseas Agent instructions, and delivery orders. |
| **4. Customs Clearance Portal (التخليص الجمركي)** | Customs Brokers, Port Expeditors (مناديب الموانئ) | Manage Egyptian ACI (نظام نافذة - رقم ACID), Certificate 46 tracking, customs tariff calculations, physical inspection scheduling (كشف وتثمين وتحريز), and duty payments. |
| **5. Masters & Tariff Management** | Operations Admin, System Admin | Universal registry for World Seaports & Dry Ports (UNLOCODE + manual add), Shipping Lines (خطوط الملاحة), Overseas Agents (وكلاء الخارج), Vendors (شركات النقل والتخليص), and Universal Charge Items (البنود). |
| **6. Financials & Billing** | Accountants, Financial Controllers | Generate official multi-currency tax invoices, verify vendor disbursement vouchers (خطوط الملاحة، النقل، عمال الميناء), and calculate net job profitability. |

---

### 1.2 Core Domain Rules Extracted from Audio

1. **Client Lifecycle & Classification (كلاينت)**:
   - **Types**: Manufacturer / Factory (مصنع), Distributor (موزع), Trader (تاجر), Customs Broker (مخلص / بروكر), Overseas Agent (وكيل خارجي).
   - **Quick Lead vs. Actual Client**: Sales reps on phone calls create a minimal *Prospect* (Phone, Name, Commodity). Once qualified, clicking `Convert to Actual Client` triggers a data-completeness validation (Tax Card, Commercial Register, multiple Contact Persons with decision-maker flags).
   - **Attachments with Expiry**: Ability to attach commercial registers, tax cards, import/export licenses with **Expiration Dates** (تاريخ انتهاء الصلاحية) and automated alerting.

2. **The Universal Charge Item System (مفهوم البنود)**:
   - Every cost or charge in the platform is a reusable `ChargeItem` (e.g., Ocean Freight - نولون بحري, Terminal Handling Charges - THQ, Inland Haulage - نولون بري, Customs Brokerage Fees - أتعاب تخليص, Storage & Demurrage - غرامات وأرضيات).
   - **Where it reflects (أين يسمع البند)**:
     - Can reflect in **Pricing Calculation** (Cost vs. Selling).
     - Can reflect in **Client Quotation (Offer)**.
     - Can reflect in **Sales Commission**.
     - Can reflect in **Client Final Invoice**.
     - Can reflect in **Vendor Disbursement Voucher**.

3. **Port & City Resolution (الموانئ والمدن)**:
   - Built-in global database of seaports, airports, and dry ports (UNLOCODE).
   - **Dynamic Fallback**: If an inland depot or specialized dry port (e.g., الروبيكي، ميناء 6 أكتوبر الجاف، كفر داود) is missing, users can add it on-the-fly *manually*, and it automatically enters the company's autocompletion registry for future quotes.

4. **Multi-Stage Operational Handoffs**:
   - `Lead` ➔ `Quote Request` ➔ `Pricing Desk Offer` ➔ `Sales Presentation` ➔ `Client Confirmation (Won)` ➔ `Operations Job Folder` ➔ `Customs & Clearance` ➔ `Invoice & Close`.

---

## 2. End-to-End User Flows & Hand-Offs

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   STEP 1: SALES & CRM                                       │
│  Sales Rep logs call ──▶ Creates Prospect ──▶ Qualifies & Converts to Actual Client        │
│  Files "Quote Request" (Origin: Ningbo, Dest: Alexandria, Cargo: 2x40HQ Ceramic, Clearance)│
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ Triggers Notification & Queue
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                STEP 2: PRICING DESK (التسعير)                               │
│  Pricing specialist reviews request ──▶ Selects Shipping Line (e.g., COSCO / MSC)          │
│  Attaches Charge Items:                                                                     │
│    • Ocean Freight: $2,400 / 40HQ (Cost $2,200 + $200 Margin)                               │
│    • Inland Haulage: Alexandria to 6th of October (EGP 14,000)                              │
│    • Customs Clearance: EGP 4,500 flat fee                                                  │
│  Clicks "Generate Offer" ──▶ Assigns Quote Reference (e.g., QT-2026-0891)                   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ Automatically reflects in Sales Rep Dashboard
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             STEP 3: SALES OFFER NEGOTIATION                                 │
│  Sales rep reviews Offer ──▶ Generates Branded PDF (English/Arabic) or sends via WhatsApp   │
│  Client accepts ──▶ Sales rep clicks "Accept & Confirm"                                     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ Automatically creates Operations Job File
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               STEP 4: OPERATIONS & EXECUTION                                │
│  Job File (SHP-2026-0142) opened in Operations Multi-Tab Workspace                          │
│  Ops assigns Booking No., Container Nos., Vessel Name, Voyage, ETD, ETA                      │
│  Uploads Bill of Lading (B/L), Cargo Manifest, Commercial Invoice, Packing List             │
│  Overseas Agent portal syncs pre-carriage milestones                                        │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ Parallel branch to Customs Team
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           STEP 5: CUSTOMS CLEARANCE (التخليص)                               │
│  Customs Broker receives dossier ──▶ Inputs ACID No. (NAFEZA)                               │
│  Updates stages: "Document Review" ──▶ "Inspection" ──▶ "Assessment" ──▶ "Release (46)"     │
│  Uploads Customs Release Certificate & Duty Payment Receipt                                 │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ Operations Closes Delivery
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               STEP 6: FINANCE & INVOICING                                   │
│  System aggregates all billable items from Quote + Operational Demurrage (if any)           │
│  Issues Client Tax Invoice & Reconciles Shipping Line / Vendor Disbursements                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. System Architecture

A **Hardened Modular Monolith with Event-Driven Background Workers**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      EDGE & CLIENTS                                     │
│                                                                                         │
│   ┌────────────────────────────────────────────────┐  ┌──────────────────────────────┐  │
│   │        Internal Back-Office ERP (SPA)          │  │    External Client Portal    │  │
│   │   React 18/19 + Vite + TypeScript + Tailwind   │  │    (React SPA - Tracking)    │  │
│   └───────────────────────┬────────────────────────┘  └──────────────┬───────────────┘  │
└───────────────────────────┼──────────────────────────────────────────┼──────────────────┘
                            │ HTTPS / WSS                              │ HTTPS
                            ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           REVERSE PROXY & GATEWAY (Caddy / Nginx)                       │
│             SSL / TLS Termination │ Compression (Gzip/Brotli) │ Rate Limiting           │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ Reverse Proxy to localhost:3000
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               CORE API RUNTIME (NestJS)                                 │
│                                                                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐  │
│  │   Auth/RBAC   │ │  CRM / Client │ │  Pricing Desk │ │  Operations   │ │ Clearance │  │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └─────┬─────┘  │
│          │                 │                 │                 │               │        │
│  ────────┴─────────────────┴─────────────────┴─────────────────┴───────────────┴──────  │
│                 Domain Event Bus (EventEmitter2 / Transactional Outbox)                 │
└───────────────────┬───────────────────────────────────────────────┬─────────────────────┘
                    │ Database Connection Pool                      │ Queue Jobs
                    ▼                                               ▼
┌───────────────────────────────────────────────┐   ┌─────────────────────────────────────┐
│          POSTGRESQL 16 (Primary)              │   │           REDIS 7 + BULLMQ          │
│  - Native Row-Level Security (Multi-Tenant)   │   │  - Distributed Session & Cache      │
│  - Full Text Search (Arabic/English)          │   │  - Async BullMQ Worker Queues       │
│  - Audit Triggers (Immutable Log)             │   │  - Real-time Pub/Sub WebSockets     │
└───────────────────────────────────────────────┘   └──────────────────┬──────────────────┘
                                                                       │
                                      ┌────────────────────────────────┴────────────────┐
                                      ▼                                                 ▼
                      ┌───────────────────────────────┐                 ┌───────────────────────────────┐
                      │    ISOLATED NODE WORKERS      │                 │     GOTENBERG PDF SERVICE     │
                      │  - Automated WhatsApp Alerts  │                 │  - Headless Chromium in Go    │
                      │  - Expiry Reminders Engine    │                 │  - Generates Invoices/Quotes  │
                      │  - OCR Document Extractor     │                 │  - Zero API Event Loop Block  │
                      └───────────────────────────────┘                 └───────────────────────────────┘
```

---

## 4. Frontend Architecture

### 4.1 Technology Stack & Decisions
* **Build Tool & Framework**: **React 18/19 + Vite (TypeScript)**.
  - *Why not Next.js?* Zero SSR requirement for internal dashboards, instant HMR, smaller bundle size, no hydration crashes with complex stateful data grids.
* **State Management**:
  - **Server Cache**: `@tanstack/react-query` (v5) — optimistic updates, background refetching, query invalidation.
  - **Local UI & Multi-Tab State**: `zustand` (lightweight, zero boilerplate).
* **Data Grids & Dense Tables**: `@tanstack/react-table` (v8) + `@tanstack/react-virtual` (renders 10,000+ shipment rows smoothly with column resizing, pinning, and multi-sort).
* **Forms & Complex Rules**: `react-hook-form` + `zod` schema resolvers.
* **Component Library**: `shadcn/ui` + `Radix UI` primitives.
* **RTL & Internationalization**: `i18next` + `react-i18next` with `tailwindcss-rtl`. Layout switches cleanly between Egyptian Arabic (primary) and English.

### 4.2 Multi-Tab Workspace Architecture (Browser-in-App)
Logistics operators constantly jump between a shipment, a client profile, and a pricing quote. v2 implements a persistent workspace tab system:
```typescript
interface WorkspaceTab {
  id: string; // e.g., "shipment-SHP-2026-0142"
  title: string; // "SHP-2026-0142 (MSC)"
  type: 'shipment' | 'client' | 'quote' | 'clearance' | 'reports';
  entityId: string;
  isDirty: boolean; // Flags unsaved form edits
}
```

---

## 5. Backend Architecture (NestJS Clean Modular Monolith)

### 5.1 Architectural Principles
* **Domain-Driven Module Boundaries**: Strict separation of concerns (`crm`, `pricing`, `operations`, `clearance`, `masters`, `billing`).
* **Dependency Rule**: Modules communicate via exported Services or asynchronous Domain Events; no circular dependencies.
* **Transaction & Context Propagation**: Every incoming HTTP request passes through a `TenantContextMiddleware` that binds the user's `company_id` to PostgreSQL's session state.

---

## 6. Database Schema (PostgreSQL 16 with Native RLS)

Below is the complete production-grade DDL.

```sql
-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TENANT RESOLUTION FUNCTION
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- 1. COMPANIES (TENANTS)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'USD',
    tax_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS & ROLES
CREATE TYPE user_role AS ENUM (
    'super_admin', 'company_admin', 'sales_rep', 
    'pricing_specialist', 'operations_agent', 'customs_broker', 'accountant'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_isolation ON users FOR ALL USING (company_id = current_tenant_id());

-- 3. CLIENTS (PROSPECTS & ACTUAL)
CREATE TYPE client_type AS ENUM ('manufacturer', 'distributor', 'trader', 'broker', 'agent');
CREATE TYPE client_status AS ENUM ('prospect', 'actual', 'inactive', 'blacklisted');

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    client_type client_type NOT NULL,
    status client_status DEFAULT 'prospect',
    tax_id VARCHAR(50),
    commercial_register VARCHAR(50),
    address_line TEXT,
    city VARCHAR(100),
    country_code VARCHAR(2) DEFAULT 'EG',
    sales_rep_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, client_code)
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_isolation ON clients FOR ALL USING (company_id = current_tenant_id());

-- 4. CLIENT CONTACT PERSONS
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(100),
    is_decision_maker BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_isolation ON client_contacts FOR ALL USING (company_id = current_tenant_id());

-- 5. PORTS & LOCATIONS MASTER
CREATE TYPE port_type AS ENUM ('seaport', 'airport', 'dry_port', 'inland_depot');

CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = System Global Port
    code VARCHAR(10) NOT NULL, -- UNLOCODE (e.g., EGALY, CNSHG)
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    port_type port_type NOT NULL,
    is_custom_added BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;
CREATE POLICY ports_isolation ON ports FOR ALL USING (company_id IS NULL OR company_id = current_tenant_id());

-- 6. SHIPPING LINES & OVERSEAS AGENTS
CREATE TABLE shipping_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    scac_code VARCHAR(10),
    local_agent_name VARCHAR(150),
    booking_contact_email VARCHAR(150),
    is_active BOOLEAN DEFAULT true
);
ALTER TABLE shipping_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipping_lines_isolation ON shipping_lines FOR ALL USING (company_id = current_tenant_id());

CREATE TABLE overseas_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agency_name VARCHAR(150) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    city VARCHAR(100),
    contact_name VARCHAR(150),
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    portal_access BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE overseas_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY overseas_agents_isolation ON overseas_agents FOR ALL USING (company_id = current_tenant_id());

-- 7. REUSABLE CHARGE ITEMS (مكتبة البنود)
CREATE TABLE charge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'freight', 'local_port', 'customs', 'haulage'
    default_currency VARCHAR(3) DEFAULT 'USD',
    reflects_in_pricing BOOLEAN DEFAULT true,
    reflects_in_quotation BOOLEAN DEFAULT true,
    reflects_in_invoice BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true
);
ALTER TABLE charge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY charge_items_isolation ON charge_items FOR ALL USING (company_id = current_tenant_id());

-- 8. QUOTATIONS & OFFERS
CREATE TYPE quote_status AS ENUM ('draft', 'pending_pricing', 'offered_to_client', 'won', 'lost', 'expired');

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id),
    contact_id UUID REFERENCES client_contacts(id),
    service_type VARCHAR(50) NOT NULL, -- 'sea_fcl', 'sea_lcl', 'air', 'clearance_only'
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    shipping_line_id UUID REFERENCES shipping_lines(id),
    incoterm VARCHAR(10) DEFAULT 'FOB',
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    valid_until DATE NOT NULL,
    status quote_status DEFAULT 'draft',
    total_cost NUMERIC(14, 2) DEFAULT 0,
    total_selling NUMERIC(14, 2) DEFAULT 0,
    net_margin NUMERIC(14, 2) DEFAULT 0,
    sales_rep_id UUID NOT NULL REFERENCES users(id),
    pricing_agent_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotations_isolation ON quotations FOR ALL USING (company_id = current_tenant_id());

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    charge_item_id UUID REFERENCES charge_items(id),
    description VARCHAR(255) NOT NULL,
    container_spec VARCHAR(50), -- '20GP', '40HQ', 'LCL per CBM'
    quantity NUMERIC(10, 2) DEFAULT 1,
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    unit_selling NUMERIC(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT
);

-- 9. SHIPMENTS / OPERATIONS
CREATE TYPE shipment_stage AS ENUM ('booking', 'in_transit', 'arrived_port', 'customs_clearance', 'delivered', 'closed');

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id UUID REFERENCES quotations(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    service_type VARCHAR(50) NOT NULL,
    bl_number VARCHAR(100),
    vessel_name VARCHAR(150),
    voyage_number VARCHAR(50),
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    shipping_line_id UUID REFERENCES shipping_lines(id),
    overseas_agent_id UUID REFERENCES overseas_agents(id),
    current_stage shipment_stage DEFAULT 'booking',
    container_count INTEGER DEFAULT 1,
    cargo_weight_kg NUMERIC(12, 2),
    cargo_volume_cbm NUMERIC(10, 2),
    etd DATE,
    eta DATE,
    ata DATE,
    ops_assignee_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipments_isolation ON shipments FOR ALL USING (company_id = current_tenant_id());

-- 10. CUSTOMS CLEARANCE DOSSIER (منظومة نافذة والتخليص الجمركي)
CREATE TYPE clearance_status AS ENUM (
    'doc_collection', 'acid_issued', 'under_customs_exam', 
    'appraisal_valuation', 'tax_settled', 'final_release'
);

CREATE TABLE customs_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    acid_number VARCHAR(50), -- رقم القيد المسبق للشحنات ACI
    certificate_46_number VARCHAR(50), -- رقم الشهادة الجمركية 46
    port_id UUID REFERENCES ports(id),
    status clearance_status DEFAULT 'doc_collection',
    duty_amount NUMERIC(14, 2) DEFAULT 0,
    vat_amount NUMERIC(14, 2) DEFAULT 0,
    inspection_date DATE,
    release_date DATE,
    assigned_broker_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customs_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customs_isolation ON customs_dossiers FOR ALL USING (company_id = current_tenant_id());

-- 11. ATTACHMENTS & DOCUMENT EXPIRIES (المرفقات وتواريخ الانتهاء)
CREATE TABLE entity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'client', 'shipment', 'clearance'
    entity_id UUID NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    file_key VARCHAR(500) NOT NULL, -- S3/R2 storage key
    file_size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    expiry_date DATE, -- Expiration alert trigger
    is_verified BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE entity_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_isolation ON entity_documents FOR ALL USING (company_id = current_tenant_id());

-- 12. REMINDERS & AUTOMATION HUB (نظام التنبيهات)
CREATE TABLE scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    title VARCHAR(255) NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY reminders_isolation ON scheduled_reminders FOR ALL USING (company_id = current_tenant_id());
```

---

## 7. API Architecture & Service Contracts

### 7.1 Standardized API Envelope
Every endpoint returns a predictable envelope with strict error schemas:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1420
  },
  "timestamp": "2026-09-18T01:40:00Z"
}
```

### 7.2 Key Endpoint Clusters

```http
### CRM & Clients
POST   /api/v1/crm/prospects               # Quick phone lead
POST   /api/v1/crm/clients/:id/convert     # Convert to actual client
GET    /api/v1/crm/clients                 # Filtered by sales_rep, type, status
POST   /api/v1/crm/clients/:id/contacts    # Add contact person

### Pricing Desk
GET    /api/v1/pricing/requests            # Inbox of pending pricing requests
POST   /api/v1/pricing/quotes/:id/offer    # Issue formal offer to sales
POST   /api/v1/pricing/quotes/:id/accept   # Confirm won quote -> auto-create shipment

### Operations
GET    /api/v1/operations/shipments        # Dense table with stage filters
PATCH  /api/v1/operations/shipments/:id/stage # Transition stage with validation
POST   /api/v1/operations/shipments/:id/documents # Upload B/L, Manifest, etc.

### Customs Clearance
POST   /api/v1/clearance/dossiers          # Initiate clearance dossier
PATCH  /api/v1/clearance/dossiers/:id/acid # Update ACID number & inspection date

### Document & PDF Engine
POST   /api/v1/documents/presign-upload    # Pre-signed S3 upload URL
GET    /api/v1/quotes/:id/generate-pdf     # Triggers Gotenberg isolated PDF build
```

---

## 8. Authentication & Granular RBAC / ABAC

### 8.1 JWT Strategy
* **Access Token**: Short-lived (15 minutes), holds `sub` (User ID), `company_id`, `role`, and `permissions` hash.
* **Refresh Token**: Long-lived (30 days), stored in secure `HTTP-Only, SameSite=Lax` cookie with automatic rotation and device fingerprinting.

### 8.2 Granular Permissions Matrix

| Capability | Super Admin | Sales Rep | Pricing Specialist | Operations Officer | Customs Broker |
|---|---|---|---|---|---|
| View All Company Clients | ✅ | ❌ (Own only) | ✅ | ✅ | ❌ |
| Convert Prospect to Client | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Cost Rates & Margins | ✅ | ❌ (Selling only) | ✅ | ❌ | ❌ |
| Issue Official Offer | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit B/L & Vessel Data | ✅ | ❌ | ❌ | ✅ | ❌ |
| Update ACID & Clearance | ✅ | ❌ | ❌ | ❌ | ✅ |
| Access Financial Invoices | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 9. File & Document Storage Architecture

### Direct-to-Storage Pipeline (Zero API Memory Overhead)
Large commercial files (100-page cargo manifests, high-res commercial invoices, scans of Form 46) must **never** buffer through the Node.js API server.

```
Client App (Vite) 
  ──1. Request Upload Permit──▶ NestJS API (Validates MIME & File size)
  ◀──2. Returns Pre-signed PUT URL (Cloudflare R2 / S3)──
  ──3. Direct Binary PUT to Cloudflare R2──▶ Cloudflare Storage
  ──4. Confirm Upload ──▶ NestJS API (Saves file metadata & triggers expiry watcher)
```

* **Storage Provider**: **Cloudflare R2** (S3-compatible, with **$0 egress fees** when downloading thousands of PDFs).
* **Document Expiry Engine**: Daily BullMQ cron inspects `entity_documents.expiry_date`. When `expiry_date <= NOW() + INTERVAL '15 days'`, it generates automated dashboard alerts and WhatsApp reminders to the assigned account manager.

---

## 10. Third-Party Integrations

1. **NAFEZA (نافذة) Egyptian Customs**:
   - Webhook & EDI XML ingestion for ACID number validation and electronic invoice clearance.
2. **UNLOCODE Global Port Registry**:
   - Pre-loaded database of 100,000+ international ports with automated local fallback caching.
3. **WhatsApp Cloud API (Meta)**:
   - Automated delivery of Quotation PDFs and container milestone alerts directly to client procurement managers.
4. **Live FX Rates (Central Bank of Egypt & OpenExchangeRates)**:
   - Daily caching of official USD/EUR/EGP conversion rates to lock in accurate quote margins.

---

## 11. AI & Automated Document Processing Architecture

* **Philosophy**: No uncontrolled generative hallucinations on pricing. AI is applied where it excels: **OCR & Unstructured Document Data Extraction**.
* **Engine**: Asynchronous BullMQ Worker running **Tesseract / AWS Textract / Claude 3.5 Sonnet Vision**.
* **Use Case**:
  - When an operations clerk drops an image or scanned PDF of a **Bill of Lading (B/L)**, the worker extracts:
    - B/L Number
    - Container Number(s)
    - Vessel & Voyage
    - Shipper & Consignee Name
    - Gross Weight & Volume
  - The UI presents an interactive *Review & Confirm* modal where extracted fields pre-fill the form, saving 15 minutes of manual data entry per shipment.

---

## 12. Scalability & High-Throughput Strategy

* **Connection Pooling**: **PgBouncer** in transaction pooling mode prevents connection starvation under spike traffic.
* **Database Partitioning**:
  - `entity_documents` and `audit_logs` are partitioned by year/quarter.
* **Read-Replica Routing**:
  - Heavy analytical queries (e.g., Sales Manager Quarterly Performance) are directed to a read replica, keeping the primary instance 100% responsive for operational mutations.

---

## 13. Security, Compliance & Audit Immutability

1. **Row-Level Security (RLS)**:
   - Enforced in the PostgreSQL kernel. Prevents multi-tenant data leaks even in the event of ORM misconfiguration.
2. **PostgreSQL Trigger-Based Audit Trail**:
   - Any `UPDATE` or `DELETE` on financial amounts, quotation margins, or customs clearance statuses writes an immutable JSON snapshot to `audit_logs` via database triggers, recording who changed what and when.
3. **Rate Limiting**:
   - Redis-backed sliding window rate limiter: 100 requests/minute for standard endpoints; 5 requests/minute for `/auth/login`.

---

## 14. Caching & State Invalidation Strategy

```
Layer 1: Browser & CDN Cache
  - Static Vite Assets (JS/CSS/Fonts): Cache-Control: max-age=31536000, immutable
  - Pre-signed Download URLs: 15-minute temporary validity

Layer 2: Redis Application Cache
  - Master Data (Ports, Shipping Lines, Charge Items): Cached with 24-hour TTL
  - User Permissions: Cached per session, invalidated instantly on role change
  - Invalidation: Tag-based eviction when master data is mutated
```

---

## 15. Queues, Asynchronous Workflows & Scheduled Jobs

All background workloads run through **BullMQ** backed by Redis:

```
├── queue:pdf-generation     (Dispatches HTML payloads to Gotenberg container)
├── queue:notifications      (Sends WhatsApp messages & transactional emails)
├── queue:document-ocr       (Processes uploaded B/Ls and invoices asynchronously)
└── queue:cron-scheduler
    ├── daily-expiry-check   (Runs at 08:00 AM: audits expiring licenses & documents)
    ├── quote-expiration    (Runs at 00:00: flags expired quotes beyond validity date)
    └── currency-sync        (Runs every 6 hours: fetches CBE exchange rates)
```

---

## 16. Deployment & Infrastructure Topology

### The Production Topology ($80 – $140 / month)
A robust setup designed to support 50+ concurrent logistics companies and up to 100,000 active shipments without AWS billing runaway:

```
┌─────────────────────────────────────────────────────────────┐
│             DEDICATED HOST (Hetzner / OVH)                 │
│         8 vCPUs │ 32 GB RAM │ 2x 512GB NVMe (RAID 1)        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │   Caddy 2 (Reverse Proxy, SSL, Brotli, WAF)         │   │
│   └──────────┬───────────────────────────────┬──────────┘   │
│              │                               │              │
│              ▼                               ▼              │
│   ┌──────────────────────┐      ┌───────────────────────┐   │
│   │  NestJS Core API     │      │  Gotenberg PDF Engine │   │
│   │  (2 PM2 Cluster Nodes│      │  (Docker container)   │   │
│   └──────────┬───────────┘      └───────────────────────┘   │
│              │                                              │
│              ▼                                              │
│   ┌──────────────────────┐      ┌───────────────────────┐   │
│   │  PostgreSQL 16 Engine│      │  Redis 7 In-Memory    │   │
│   │  (Tuned for NVMe)    │      │  (BullMQ + Caching)   │   │
│   └──────────────────────┘      └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │ Daily Encrypted Snapshots
                               ▼
            Cloudflare R2 (Off-site Database Backups)
```

---

## 17. Complete Project & Monorepo Directory Structure

```
banna-monorepo/
├── apps/
│   ├── web/                         # Primary React 18/19 + Vite SPA (ERP)
│   │   ├── src/
│   │   │   ├── app/                 # App Router / Layouts
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn/ui components
│   │   │   │   ├── workspace/       # Multi-tab workspace manager
│   │   │   │   ├── data-table/      # TanStack virtualized data grids
│   │   │   │   └── forms/           # Zod-validated forms
│   │   │   ├── modules/
│   │   │   │   ├── crm/             # Prospects, Clients, Contacts views
│   │   │   │   ├── pricing/         # Pricing Desk, Quote builder
│   │   │   │   ├── operations/      # Shipment execution tables & tabs
│   │   │   │   ├── clearance/       # NAFEZA / ACID dossier views
│   │   │   │   └── masters/         # Ports, Lines, Charge items
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── stores/              # Zustand state stores
│   │   │   └── lib/                 # API client, i18n RTL config
│   │   └── package.json
│   │
│   ├── api/                         # NestJS Backend API
│   │   ├── src/
│   │   │   ├── core/                # Core security, RLS context, database
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # JWT, RBAC guards
│   │   │   │   ├── crm/             # Clients, Contacts, Prospects
│   │   │   │   ├── pricing/         # Tariff calculation engine
│   │   │   │   ├── operations/      # Shipments, Milestones
│   │   │   │   ├── clearance/       # Customs dossiers
│   │   │   │   ├── masters/         # Ports, Lines, Charge Items
│   │   │   │   ├── documents/       # Pre-signed R2 storage & Gotenberg PDF
│   │   │   │   └── reminders/       # BullMQ scheduler
│   │   │   └── main.ts
│   │   ├── prisma/                  # Schema & Migrations
│   │   └── package.json
│   │
│   └── workers/                     # Background queue consumer process
│       ├── src/
│       │   ├── processors/          # OCR, WhatsApp, Email, Cron
│       │   └── worker.ts
│       └── package.json
│
├── packages/
│   ├── shared-types/                # Shared TypeScript DTOs & Enums
│   └── eslint-config/               # Shared linting rules
│
├── docker/
│   ├── docker-compose.yml           # Local & Production orchestration
│   ├── Caddyfile                    # Reverse proxy configuration
│   └── Dockerfile.api
│
├── turbo.json                       # Turborepo build pipeline
└── package.json
```

---

## 18. Technology Choices, Trade-Offs & Alternatives Matrix

| Layer | Chosen Technology | Alternatives Evaluated | Decisive Architectural Rationale |
|---|---|---|---|
| **Frontend** | **React + Vite (SPA)** | Next.js 14, Remix | No SEO need for internal ERP; instant client navigation; zero SSR hydration mismatches with heavy data grids. |
| **Backend** | **NestJS (TypeScript)** | Express, Go (Gin), Fastify | Enterprise DI architecture, strict modular boundaries, excellent TypeScript ecosystem, fast delivery. |
| **Database** | **PostgreSQL 16** | MySQL, MongoDB | Native Row-Level Security (RLS) for multi-tenancy; robust JSONB; unmatched relational data integrity. |
| **ORM** | **Prisma + Raw SQL for RLS** | TypeORM, Drizzle | Exceptional type safety and DX, combined with raw session context for RLS policy enforcement. |
| **Queue Engine** | **BullMQ + Redis 7** | RabbitMQ, Kafka | Lightweight, low ops overhead, atomic job transitions, unified with cache layer. |
| **PDF Engine** | **Gotenberg (Go/Chromium)** | Puppeteer in-process, PDFKit | Fully isolated container prevents Node.js event-loop locking; renders complex Arabic CSS perfectly. |
| **Storage** | **Cloudflare R2** | AWS S3, Local Disk | 100% S3 compatible, global CDN, and **zero bandwidth egress charges**. |
| **Reverse Proxy** | **Caddy 2** | Nginx, Traefik | Automatic HTTPS with zero-config Let's Encrypt renewal; simple configuration syntax; HTTP/3 support. |

---

## 19. MVP Scope vs. Future Vision

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│                  PHASE 1: MVP                │            PHASE 2 & 3: FUTURE VISION        │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Multi-tenant Auth with Native RLS          │ • Mobile Companion App (React Native for Port│
│ • Client & Multiple Contact Person CRUD      │   Runners & Sales Reps on the Road)          │
│ • Universal Charge Items (البنود) Management │ • Native NAFEZA EDI Automated B2B Bridge     │
│ • Pricing Desk Quote Builder & PDF Generator │ • AI Vision OCR for Automatic B/L Parsing    │
│ • Operational Job Tracking (Booking ➔ Close) │ • Live AIS Marine Vessel Tracking Integration│
│ • Egyptian Customs Dossier (ACID & Cert 46)  │ • Customer Self-Service Online Booking Portal│
│ • Automated WhatsApp & Expiry Reminders      │ • Integrated General Ledger & Accounting     │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 20. Implementation Roadmap

### Sprint Schedule (14 Weeks to Production Launch)

```
[Weeks 1-2]   Infrastructure, Database Hardening & Auth
              ├── Turborepo & Docker environment setup
              ├── PostgreSQL 16 schema deployment with Row-Level Security (RLS)
              ├── NestJS JWT authentication, refresh token rotation, and RBAC guards
              └── React + Vite SPA scaffold with Arabic RTL layout and theme

[Weeks 3-4]   Master Data & CRM Module
              ├── Ports registry (UNLOCODE seed + on-the-fly custom addition)
              ├── Shipping Lines, Overseas Agents, and Vendors directory
              ├── Universal Charge Items (البنود) management
              └── Prospects & Client lifecycle (Multi-contacts, tax IDs, attachments)

[Weeks 5-7]   Pricing Desk & Gotenberg PDF Engine
              ├── Sales Quote Request submission workflow
              ├── Pricing Desk line-item tariff calculation (Cost vs Selling)
              ├── Gotenberg microservice integration for Arabic/English Quotation PDFs
              └── WhatsApp Cloud API integration for one-click quote delivery

[Weeks 8-10]  Shipments & Operations Multi-Tab Workspace
              ├── One-click conversion from Won Quote to Operations Job File
              ├── Virtualized Data Grid with stage filters (Booking ➔ Transit ➔ Delivered)
              ├── Multi-tab workspace state management (Zustand)
              └── Direct-to-R2 pre-signed document upload with expiry tracking

[Weeks 11-12] Customs Clearance (التخليص) & Financial Billing
              ├── Customs Dossier tracking (ACID No., Certificate 46, Inspection logs)
              ├── BullMQ automated reminder engine for approaching expirations
              └── Client Tax Invoice generation and vendor disbursement vouchers

[Weeks 13-14] UAT, Hardening & Production Deployment
              ├── End-to-end integration testing and multi-tenant security penetration tests
              ├── Caddy reverse proxy setup on dedicated Hetzner host
              └── Pilot rollout with real-world freight forwarding team
```
