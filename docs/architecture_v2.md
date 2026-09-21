# 🚢 Banna Logistics ERP/CRM — Architecture v2
## The Senior Software Architect's Self-Challenge & Hardened Blueprint

---

# PART I: The Architectural Self-Challenge (Post-Mortem of v1)

Before writing a single line of production code, a Senior Software Architect must brutally challenge their initial assumptions. Architecture v1 had several critical flaws, over-engineered layers, and operational traps common in modern software designs.

---

### 1. The Frontend Mismatch: Why Next.js 14 was the Wrong Choice
* **The Flaw in v1:** Choosing Next.js 14 App Router for an internal B2B Operations ERP.
* **The Reality:**
  1. **Zero SEO Benefit:** An authenticated ERP dashboard behind a login page needs 0% SEO. Server-Side Rendering (SSR) offers no commercial value here.
  2. **Hydration & Component Friction:** Freight forwarding ERPs rely heavily on dense, interactive data tables (TanStack Table / AG-Grid), multi-level editable spreadsheet cells, split-pane document viewers (PDF next to data entry form), and persistent websocket connections. In Next.js 14 App Router, maintaining client-side state across server/client component boundaries creates unnecessary bugs, hydration mismatches, and sluggish state sync.
  3. **Hosting & Maintenance Cost:** Next.js requires active Node.js server runtimes (`next start`) with memory overhead for SSR.
* **The v2 Best Practice:** **React 18/19 + Vite SPA**.
  * Deploys as pure static assets to a global CDN (Cloudflare / CloudFront) for virtually $0/month.
  * Instant sub-millisecond client-side transitions.
  * Completely decoupled from backend restarts or deployments.

---

### 2. The Multi-Tenancy Security Trap (Data Leak Disaster)
* **The Flaw in v1:** Relying solely on application-level ORM filters (`where: { company_id }`).
* **The Catastrophe Risk:** In logistics, customer lists, shipping line negotiated rates, and profit margins are trade secrets. If a developer writes a single raw query, misses a join clause, or an ORM hook fails, **Company A sees Company B’s shipping rates and client lists**.
* **The v2 Best Practice:** **Defense-in-Depth with PostgreSQL Row Level Security (RLS)**.
  * Multi-tenancy is enforced directly at the database engine kernel level via `SET LOCAL app.current_tenant_id = '...'` in every transaction.
  * Even if a developer writes `SELECT * FROM clients` without a WHERE clause, PostgreSQL will physically refuse to return rows belonging to other tenants.

---

### 3. Premature AI & Vector Over-Engineering
* **The Flaw in v1:** Introducing pgvector, vector embeddings, and autonomous RAG agents for quotation pricing into the MVP.
* **The Reality:** Freight forwarding rate cards (نولون الشحن، مصاريف التعتيق، رسوم الموانئ، نولون بري) are **strictly deterministic tabular data** governed by weight breaks, validity windows, container types (20GP, 40HQ, Reefer), and fuel adjustments (BAF/CAF). Using an LLM to "hallucinate" prices can lead to catastrophic underquoting and massive financial loss.
* **The v2 Best Practice:**
  * **Core Pricing:** A deterministic, rule-based **Tariff & Rate-Sheet Engine** (PostgreSQL relational + JSONB rules).
  * **AI’s Real Role:** Confined to asynchronous auxiliary workers: OCR document extraction (extracting B/L numbers and container IDs from scanned customs manifests) and natural language draft generation for client emails.

---

### 4. The PDF & Computation Event-Loop Blocker
* **The Flaw in v1:** Generating quotations, manifests, and invoices inside the main API process.
* **The Bottleneck:** Launching headless Chromium (Puppeteer) or heavy PDF engines inside a Node.js process blocks the single-threaded event loop. Under load (e.g., end-of-month invoicing batch), API response times for all users spike from 50ms to 8,000ms+.
* **The v2 Best Practice:** **Dedicated Gotenberg Service / Isolated BullMQ Workers**.
  * PDF generation is offloaded asynchronously to a stateless Go-based microservice ([Gotenberg](https://gotenberg.dev/)) or dedicated worker containers that convert clean HTML/CSS templates into high-fidelity PDFs without touching the API event loop.

---

### 5. Infrastructure Cost Burn vs. Pragmatic Reality
* **The Flaw in v1:** AWS ECS Fargate + ALB + RDS Multi-AZ + ElastiCache + CloudWatch.
  * **Cost:** $800 to $1,400 / month before the system even books its first shipment!
* **The v2 Best Practice:** **Pragmatic Production Topology ($60 – $120 / month)**.
  * Dedicated high-performance VPS (Hetzner / OVH / DigitalOcean: 8 vCPU, 32GB RAM, NVMe) managed via Docker Compose or Coolify.
  * Automated offsite S3 backups for database and document storage.
  * Capable of handling up to 50,000 active monthly shipments effortlessly with sub-50ms API latencies.
  * Cloud migration (ECS / K8s) only when scale and compliance demand it.

---

# PART II: Complete Architecture v2 Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                           │
│                                                                        │
│  ┌───────────────────────────────────┐  ┌───────────────────────────┐  │
│  │   Operations & Back-Office ERP    │  │   Client & Agent Portal   │  │
│  │   (React + Vite SPA + Tailwind)   │  │   (Lightweight React SPA) │  │
│  └─────────────────┬─────────────────┘  └─────────────┬─────────────┘  │
└────────────────────┼──────────────────────────────────┼────────────────┘
                     │ HTTPS / WSS                      │ HTTPS
                     ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│               REVERSE PROXY & EDGE (Traefik / Caddy / Nginx)           │
│       TLS Termination │ Rate Limiting │ Static CDN │ WebSockets        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE API (NestJS Monolith)                      │
│                                                                        │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐  │
│   │ Client & CRM  │ │ Pricing/Quote │ │ Operations/BL │ │ Clearance │  │
│   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └─────┬─────┘  │
│           │                 │                 │               │        │
│   ────────┴─────────────────┴─────────────────┴───────────────┴────   │
│                 Domain Event Bus / Outbox Pattern                      │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
       Database I/O │                               │ Job Dispatch
                    ▼                               ▼
┌──────────────────────────────────┐ ┌───────────────────────────────────┐
│     POSTGRESQL 16 (Hardened)     │ │        REDIS 7 + BULLMQ           │
│  - Native Row-Level Security     │ │  - Session / Rate Limit Cache     │
│  - Strict Tenant Isolation       │ │  - Background Job Queues          │
│  - Immutable Audit Log Triggers  │ │  - WebSocket Pub/Sub              │
└──────────────────────────────────┘ └─────────────────┬─────────────────┘
                                                       │
                               ┌───────────────────────┴──────────────┐
                               ▼                                      ▼
               ┌───────────────────────────────┐      ┌───────────────────────────────┐
               │     ISOLATED WORKERS          │      │     GOTENBERG PDF ENGINE      │
               │  - Email / WhatsApp Dispatch  │      │  - Pixel-perfect Quotation    │
               │  - Reminders & Alerts Engine  │      │  - Official Invoice & B/L     │
               │  - OCR Document Extractor     │      │  - No Node Event Loop Impact  │
               └───────────────────────────────┘      └───────────────────────────────┘
```

---

## 1. Domain Workflows & Module Mapping (From Audio)

The system is structured into 6 tightly-integrated operational pipelines:

```
[1. CRM & Leads] ──▶ [2. Pricing & Quote] ──▶ [3. Job Confirmation]
   Sales Rep               Tariff Engine            Converted to Shipment
   Client & Contacts       Shipping Line Rates      Assigned to Ops
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
             [4. Freight Operations]                                                 [5. Customs Clearance]
             Booking ──▶ Port In ──▶ Onboard                                         Acid Number (NAFEZA)
             ETD / ETA Tracking                                                      Inspection (الكشف والتحريز)
             Container Tracking (20/40)                                              Duty & Tax Settlement
             Overseas Agent Coordination                                             Release Certificate
                      │                                                                         │
                      └────────────────────────────────────┬────────────────────────────────────┘
                                                           ▼
                                               [6. Financial Invoicing]
                                               Client Invoice (Freight + Duty)
                                               Shipping Line Disbursement
                                               Profit & Margin Analysis
```

---

## 2. Hardened Database Schema with Native RLS

Every query automatically inherits tenant isolation without relying on developer memory.

```sql
-- 1. TENANT CONTEXT HELPER
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- 2. CLIENTS TABLE
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    client_type VARCHAR(50) NOT NULL, -- 'manufacturer', 'distributor', 'trader', 'broker', 'agent'
    tax_id VARCHAR(50),
    sales_rep_id UUID,
    status VARCHAR(50) DEFAULT 'prospect', -- 'prospect', 'active', 'blacklisted'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_tenant_isolation ON clients
    FOR ALL
    USING (company_id = current_tenant_id())
    WITH CHECK (company_id = current_tenant_id());

-- 3. CLIENT CONTACT PERSONS (من سجل المكالمات والأوديو)
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(100),
    is_decision_maker BOOLEAN DEFAULT false,
    notes TEXT
);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_tenant_isolation ON client_contacts
    FOR ALL USING (company_id = current_tenant_id());

-- 4. MASTER DATA (Ports, Shipping Lines, Clearance Providers)
CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    code VARCHAR(10) NOT NULL, -- UNLOCODE (e.g., EGALY, EGEDK)
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    port_type VARCHAR(50) NOT NULL -- 'seaport', 'airport', 'dry_port'
);

CREATE TABLE shipping_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(150) NOT NULL,
    scac_code VARCHAR(10),
    contact_person VARCHAR(150),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100)
);

-- 5. QUOTATIONS & OFFERS (محرك عروض الأسعار والبند السعري)
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id),
    contact_id UUID REFERENCES client_contacts(id),
    service_type VARCHAR(50) NOT NULL, -- 'sea_import', 'sea_export', 'air', 'clearance_only'
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    shipping_line_id UUID REFERENCES shipping_lines(id),
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
    valid_until DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
    total_selling_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_cost_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_tenant_isolation ON quotations
    FOR ALL USING (company_id = current_tenant_id());

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_category VARCHAR(50) NOT NULL, -- 'freight', 'local_charges', 'customs', 'transport'
    description VARCHAR(255) NOT NULL,
    container_type VARCHAR(20), -- '20GP', '40HQ', 'LCL'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit_selling NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_rate NUMERIC(5, 2) DEFAULT 0
);

-- 6. SHIPMENTS / OPERATIONS (ملف الشحنة والعمليات)
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    file_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id UUID REFERENCES quotations(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    service_type VARCHAR(50) NOT NULL,
    bl_number VARCHAR(100), -- Bill of Lading
    vessel_name VARCHAR(150),
    voyage_number VARCHAR(50),
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    shipping_line_id UUID REFERENCES shipping_lines(id),
    overseas_agent_id UUID,
    etd DATE,
    eta DATE,
    ata DATE,
    cargo_description TEXT,
    container_count INTEGER DEFAULT 1,
    weight_kg NUMERIC(12, 2),
    volume_cbm NUMERIC(10, 2),
    current_stage VARCHAR(50) DEFAULT 'booking', -- 'booking', 'in_transit', 'arrived', 'customs', 'delivered'
    ops_handler_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipment_tenant_isolation ON shipments
    FOR ALL USING (company_id = current_tenant_id());

-- 7. CUSTOMS CLEARANCE DOSSIER (ملف التخليص الجمركي ونظام نافذة)
CREATE TABLE customs_clearance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    acid_number VARCHAR(50), -- رقم القيد المسبق للشحنات المصرية ACI
    certificate_number VARCHAR(50), -- رقم الشهادة الجمركية 46
    port_id UUID REFERENCES ports(id),
    customs_broker_id UUID, -- المخلص المعين
    status VARCHAR(50) DEFAULT 'document_prep', -- 'acid_issued', 'under_inspection', 'fees_assessed', 'final_release'
    inspection_date DATE,
    duty_amount NUMERIC(14, 2) DEFAULT 0,
    tax_amount NUMERIC(14, 2) DEFAULT 0,
    release_date DATE,
    notes TEXT
);
ALTER TABLE customs_clearance ENABLE ROW LEVEL SECURITY;
CREATE POLICY clearance_tenant_isolation ON customs_clearance
    FOR ALL USING (company_id = current_tenant_id());

-- 8. IMMUTABLE AUDIT TRAIL
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    client_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Frontend Architecture v2 (The Clean SPA)

### Core Stack
- **Framework**: React 18/19 + Vite (Fast HMR, instant builds)
- **Language**: TypeScript (strict mode)
- **Data Grids**: `@tanstack/react-table` (virtualized with `@tanstack/react-virtual` for 10,000+ rows)
- **State Management**:
  - Server State: `@tanstack/react-query` (with aggressive caching & optimistic updates)
  - UI / Tab State: `zustand` (lightweight, modular)
- **Forms & Validation**: `react-hook-form` + `zod`
- **UI Components**: `shadcn/ui` + `Radix UI` (fully customizable, unstyled primitives)
- **Styling & Direction**: Tailwind CSS with RTL plugin (`tailwindcss-rtl` for seamless Arabic/English switching)

### Layout & Multi-Tab Workspace Architecture
In freight forwarding, operations staff handle multiple shipments simultaneously. v2 implements a **Browser-in-App Multi-Tab System**:
```
┌────────────────────────────────────────────────────────────────────────┐
│  [Top Bar: User Profile | Notifications | Active Currency: USD/EGP]   │
├────────────────────────────────────────────────────────────────────────┤
│  [Tab Bar: 🏠 Dashboard × | 📦 SHP-2026-0041 × | 📄 Quote #1089 × ]   │
├───────────────────┬────────────────────────────────────────────────────┤
│ Navigation        │ Active Workspace View                              │
│ ├ Clients         │ ┌────────────────────────────────────────────────┐ │
│ ├ Quotations      │ │ Shipment Summary | Route Details | Documents   │ │
│ ├ Shipments       │ │ ┌──────────────────┐ ┌───────────────────────┐ │ │
│ ├ Clearance       │ │ │ Form 46: Released│ │ B/L: MSCU1284729      │ │ │
│ ├ Masters         │ │ └──────────────────┘ └───────────────────────┘ │ │
│ └ Reminders       │ └────────────────────────────────────────────────┘ │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 4. Backend Architecture v2 (NestJS Clean Monolith)

### Decoupled Modular Design
```
backend/
├── src/
│   ├── core/                    # Shared kernel & middleware
│   │   ├── database/            # Prisma / Kysely with RLS Context Interceptor
│   │   ├── security/            # Guards, JWT, RBAC Permissions
│   │   └── queue/               # BullMQ setup
│   ├── modules/
│   │   ├── crm/                 # Clients, Contacts, Leads
│   │   ├── pricing/             # Tariff Engine, Quotations, Items
│   │   ├── operations/          # Shipments, Tracking, Events
│   │   ├── clearance/           # Customs entries, ACID tracking
│   │   ├── masters/             # Ports, Shipping Lines, Commodities
│   │   ├── document-engine/     # S3 Presigned URLs + Gotenberg PDF client
│   │   └── notification-hub/    # Email (SendGrid), WhatsApp, In-App alerts
│   └── workers/                 # Isolated background queue processors
```

### PostgreSQL Transaction Context Middleware
Every incoming API request sets the tenant context before any query is executed:

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const tenantId = req.user?.companyId;
    if (tenantId) {
      // In PostgreSQL connection session:
      await this.prisma.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`
      );
    }
    next();
  }
}
```

---

## 5. Document & PDF Generation Architecture (Gotenberg)

To avoid Node.js CPU stalls when generating complex shipping documents:

```
[User clicks "Print Official Quotation"]
                    │
                    ▼
[NestJS API retrieves data] ──▶ [Compiles Handlebars HTML Template with Arabic CSS]
                                                      │
                                                      ▼ POST (HTML + Fonts)
                                        [Gotenberg Microservice (Docker)]
                                        - Chromium Headless in isolated Go container
                                        - High-fidelity Cairo/Arabic fonts
                                        - Generates PDF in 120ms
                                                      │
                                                      ▼ Returns binary stream
                                        [S3 / MinIO Storage]
                                                      │
                                                      ▼
[Returns signed S3 download URL to Frontend in <300ms total]
```

---

## 6. Real-World Cost Analysis: v1 vs. v2

| Component | Architecture v1 (AWS Heavy) | Architecture v2 (Pragmatic Best Practice) | Monthly Savings |
|---|---|---|---|
| **Frontend Hosting** | Next.js on Fargate ($80/mo) | Cloudflare Pages / Static CDN ($0/mo) | -$80 |
| **API Compute** | AWS ECS Fargate 2 tasks ($140/mo) | Dedicated VPS (8 vCPU / 32GB RAM) ($45/mo) | -$95 |
| **Database** | AWS RDS Multi-AZ Postgres ($220/mo) | Managed DB / Hardened Postgres on NVMe ($50/mo) | -$170 |
| **Redis Cache** | AWS ElastiCache ($90/mo) | Dedicated Redis instance on VPS ($0 added) | -$90 |
| **Load Balancer** | AWS ALB ($35/mo) | Caddy / Traefik with Auto Let's Encrypt ($0/mo) | -$35 |
| **File Storage** | S3 + CloudFront ($25/mo) | S3 / Cloudflare R2 (zero egress fees) ($10/mo) | -$15 |
| **AI / Embeddings** | AWS pgvector RDS + OpenAI RAG ($120/mo) | Targeted OCR API calls only on upload ($15/mo) | -$105 |
| **Total Monthly Cost** | **~$710 – $1,200 / month** | **~$120 / month** | **Save ~85%** |

---

## 7. Delivery Roadmap (Lean & Production-Ready)

```
[Weeks 1-2]   Foundation & Hardening
              - Monorepo, Docker Compose, Postgres 16 with RLS policies
              - Authentication (JWT + Refresh + RBAC roles)
              - React + Vite SPA scaffold with Arabic RTL setup

[Weeks 3-5]   Core CRM & Masters
              - Clients & Contact Persons (Multi-contact, decision-maker tags)
              - Masters: Ports (UNLOCODE), Shipping Lines, Commodity classifications
              - Activity Logs & Reminders engine

[Weeks 6-8]   Pricing Engine & Gotenberg PDF Builder
              - Quotation builder with granular line items (Ocean freight, Local, Customs)
              - Multiple currency support (USD / EUR / EGP with real-time conversion)
              - High-fidelity PDF quotation generation & WhatsApp/Email sending

[Weeks 9-11]  Shipment Operations & Customs Clearance
              - Conversion from Quote to Shipment Job
              - Multi-stage tracking (Booking -> In Transit -> Port -> Delivered)
              - Customs Dossier (ACID, Certificate 46, Inspection notes)
              - Document manager with S3 presigned upload

[Weeks 12-14] Financials, Reports & Client Portal
              - Invoicing engine (Freight + Clearance disbursement)
              - Operations & Sales KPI dashboards
              - Customer tracking portal (Read-only shipment tracking)
```
