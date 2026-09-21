# 🚢 Banna — Freight Forwarding & Logistics CRM/ERP
## Complete Technical Architecture Document

> **Source**: Transcribed from `Banna app-enhanced-v2.mp3` (Arabic, ~10 min, auto-transcribed via Whisper)
> **Domain**: Freight Forwarding, Customs Clearance, Logistics Management
> **Target Market**: Egypt & Arab World (MENA region)

---

## 1. 📋 Product Requirements

### Vision
A comprehensive SaaS CRM/ERP platform for freight forwarding & logistics companies — managing clients, quotations, shipments, customs clearance, overseas agents, and sales team performance from a single dashboard.

### Core User Roles

| Role | Description |
|---|---|
| **Super Admin** | Full system control, company-wide data |
| **Admin** | Company-level management |
| **Sales Person** | Manages assigned clients, quotations, follow-ups |
| **Customer** | Self-service portal for shipment tracking & invoices |
| **Overseas Agent** | External agent portal for job assignments |

### Core Modules (from audio)

1. **Client Management (كلايز)** — client profiles with types, contacts, addresses
2. **Contact Persons (كنتك تبيرسونز)** — multiple contacts per client
3. **CRM / Leads (سيار ايه)** — sales pipeline, opportunities, offers
4. **Quotation / Pricing (بريسنج)** — freight rate cards, quote builder
5. **Shipment Tracking (ترقن)** — real-time job tracking across stages
6. **Customs Clearance (تخليص)** — clearance entries, documents, status
7. **Shipping Lines (شبنج لاينز)** — manage carrier relationships
8. **Ports & Locations (مواني)** — seaports, dry ports, inland locations
9. **Overseas Agents (اوبرسيز ايجنز)** — external agent network
10. **Documents & Invoices (انفويس)** — B/L, certificates, invoices
11. **Notifications & Reminders (ريمايندرس)** — task deadlines, follow-up alerts
12. **Offers Module (اوفرز)** — rate offers sent to clients
13. **Reports & Analytics** — sales KPIs, revenue, performance dashboards

---

## 2. 🗺️ User Flows

### Sales Person Flow
```
Login → Dashboard (My Clients / My Leads / Reminders) 
  → Client Profile → Contact Persons → History
  → New Quotation → Select Commodity / Route / Service Type
  → Generate Offer → Send to Client
  → Follow-up (CRM) → Convert to Job
  → Job Creation → Assign to Operations
  → Track Shipment → Issue Invoice
```

### Operations / Clearance Flow
```
Login → Assigned Jobs (filtered by type: Air / Sea / Land / Clearance)
  → Job Detail → Update Status (tabs: Booking / In Transit / Arrived / Delivered)
  → Upload Documents (B/L, Packing List, Certificate)
  → Link Shipping Line / Port / Agent
  → Reminders for expiry dates, milestones
  → Close Job → Trigger Invoice
```

### Customer Portal Flow
```
Register / Invite → View My Shipments → Track Status
  → Download Documents / Invoices
  → Request New Quote
  → View Offer History
```

### Overseas Agent Flow
```
Invited via Email → Agent Portal Login
  → View Assigned Jobs → Update Status → Upload POD
  → Submit Invoice to Freight Forwarder
```

---

## 3. 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                             │
│  Web App (Next.js)  │  Mobile App (React Native)        │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────────────────────────────────────────┐
│              API Gateway (Kong / AWS API GW)            │
│   Rate Limiting │ Auth │ Routing │ Load Balancing       │
└───────────────────────┬────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  Core API    │ │  CRM API    │ │  Ops API     │
│  (NestJS)   │ │  (NestJS)  │ │  (NestJS)   │
│  Users/Auth │ │  Leads/     │ │  Shipments/  │
│  Clients    │ │  Quotations │ │  Clearance   │
└──────┬───────┘ └──────┬──────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │         Message Broker        │
        │      (BullMQ + Redis)         │
        └──────────────┬────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │Notification│ │Email/SMS │  │ AI Assistant │
  │  Worker  │  │  Worker  │  │   Worker     │
  └──────────┘  └──────────┘  └──────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│                 Data Layer                     │
│  PostgreSQL (primary) │ Redis (cache/sessions) │
│  S3/MinIO (files)    │ Elasticsearch (search)  │
└───────────────────────────────────────────────┘
```

---

## 4. 🖥️ Frontend Architecture

### Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **State**: Zustand (local) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts / Apache ECharts
- **Real-time**: Socket.IO client
- **i18n**: next-i18next (Arabic RTL + English LTR)
- **Mobile**: React Native (Expo) — future phase

### Key Frontend Modules

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, Register, Forgot Password
│   ├── (dashboard)/
│   │   ├── clients/              # Client management
│   │   │   ├── [id]/             # Client detail + tabs
│   │   │   └── contacts/         # Contact persons
│   │   ├── crm/
│   │   │   ├── leads/            # Lead pipeline
│   │   │   ├── offers/           # Rate offers
│   │   │   └── quotations/       # Quote builder
│   │   ├── operations/
│   │   │   ├── shipments/        # Job tracking
│   │   │   ├── clearance/        # Customs clearance
│   │   │   └── documents/        # Document manager
│   │   ├── masters/
│   │   │   ├── ports/            # Port management
│   │   │   ├── shipping-lines/   # Carrier management
│   │   │   ├── agents/           # Overseas agents
│   │   │   └── commodities/      # Commodity types
│   │   ├── reports/              # Analytics dashboards
│   │   └── settings/             # Company, users, roles
│   ├── portal/                   # Customer self-service portal
│   └── agent-portal/             # Overseas agent portal
├── components/
│   ├── ui/                       # Base components (shadcn)
│   ├── forms/                    # Reusable form components
│   ├── tables/                   # Data table variants
│   └── layout/                   # Sidebar, header, etc.
├── hooks/                        # Custom React hooks
├── lib/                          # API clients, utils
└── stores/                       # Zustand state stores
```

### RTL / Arabic Support
- `dir="rtl"` at HTML level toggled by language switcher
- Tailwind `rtl:` variants for spacing/alignment
- Arabic numerals toggled per preference
- Fonts: IBM Plex Sans Arabic + Inter (EN)

---

## 5. ⚙️ Backend Architecture

### Technology Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Validation**: class-validator + Zod
- **Auth**: Passport.js (JWT + Refresh Tokens)
- **Queue**: BullMQ
- **WebSockets**: Socket.IO (integrated with NestJS)
- **Testing**: Jest + Supertest

### Service Structure (Modular Monolith → Microservices path)

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/              # JWT, refresh, permissions
│   │   ├── users/             # User CRUD, roles
│   │   ├── companies/         # Multi-tenant company setup
│   │   ├── clients/           # Client management
│   │   │   ├── clients.service.ts
│   │   │   ├── contacts.service.ts
│   │   │   └── client-types.enum.ts
│   │   ├── crm/
│   │   │   ├── leads/         # Lead lifecycle
│   │   │   ├── quotations/    # Quote builder
│   │   │   └── offers/        # Offer management
│   │   ├── operations/
│   │   │   ├── shipments/     # Job management
│   │   │   ├── clearance/     # Customs clearance
│   │   │   └── tracking/      # Status updates
│   │   ├── masters/
│   │   │   ├── ports/
│   │   │   ├── shipping-lines/
│   │   │   ├── agents/
│   │   │   └── commodities/
│   │   ├── documents/         # File management
│   │   ├── notifications/     # In-app + push + email
│   │   ├── reports/           # Analytics queries
│   │   └── ai/                # AI assistant module
│   ├── common/
│   │   ├── guards/            # Auth, roles, permissions
│   │   ├── decorators/        # @CurrentUser, @Roles
│   │   ├── filters/           # Exception filters
│   │   ├── interceptors/      # Logging, transform
│   │   └── pipes/             # Validation pipes
│   ├── config/                # Environment configs
│   └── prisma/                # Prisma client
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
```

---

## 6. 🗄️ Database Schema

### Core Tables (PostgreSQL via Prisma)

```sql
-- MULTI-TENANCY
Table: companies
  id UUID PK
  name VARCHAR
  country_code VARCHAR(2)
  subscription_plan ENUM(starter, pro, enterprise)
  created_at TIMESTAMP

-- USERS & AUTH
Table: users
  id UUID PK
  company_id UUID FK → companies
  email VARCHAR UNIQUE
  password_hash VARCHAR
  role ENUM(super_admin, admin, sales_person, operations, agent, customer)
  first_name, last_name VARCHAR
  phone VARCHAR
  is_active BOOLEAN
  created_at, updated_at TIMESTAMP

-- PERMISSIONS (RBAC)
Table: permissions
  id, name, resource, action

Table: role_permissions
  role_id, permission_id

-- CLIENTS
Table: clients
  id UUID PK
  company_id UUID FK
  client_type ENUM(manufacturer, distributor, trader, broker, agent)
  name VARCHAR
  name_ar VARCHAR                 -- Arabic name
  tax_number VARCHAR
  country_code VARCHAR(2)
  city VARCHAR
  address TEXT
  website VARCHAR
  sales_person_id UUID FK → users
  status ENUM(active, inactive, prospect)
  source VARCHAR                  -- How they came in
  created_at, updated_at TIMESTAMP

Table: client_contacts
  id UUID PK
  client_id UUID FK
  name VARCHAR
  title VARCHAR
  email VARCHAR
  phone VARCHAR
  mobile VARCHAR
  whatsapp VARCHAR
  is_primary BOOLEAN
  notes TEXT

Table: client_addresses
  id UUID PK
  client_id UUID FK
  address_type ENUM(billing, shipping, warehouse)
  address_line1, address_line2 VARCHAR
  city, state, country, zip_code VARCHAR

-- MASTERS
Table: ports
  id UUID PK
  company_id UUID FK
  code VARCHAR(10)               -- UNLOCODE e.g. EGALY
  name VARCHAR
  name_ar VARCHAR
  country_code VARCHAR(2)
  port_type ENUM(seaport, airport, dry_port, inland)
  is_active BOOLEAN

Table: shipping_lines
  id UUID PK
  company_id UUID FK
  name VARCHAR
  scac_code VARCHAR(10)          -- Standard carrier code
  website VARCHAR
  contact_email VARCHAR
  is_active BOOLEAN

Table: overseas_agents
  id UUID PK
  company_id UUID FK
  agency_name VARCHAR
  country_code VARCHAR(2)
  city VARCHAR
  contact_name VARCHAR
  email VARCHAR
  phone VARCHAR
  portal_access BOOLEAN
  user_id UUID FK → users        -- If they have portal login
  notes TEXT

Table: commodities
  id UUID PK
  company_id UUID FK
  name VARCHAR
  name_ar VARCHAR
  hs_code VARCHAR(10)
  is_hazardous BOOLEAN
  notes TEXT

-- CRM / LEADS
Table: leads
  id UUID PK
  company_id UUID FK
  client_id UUID FK → clients    -- NULL if not yet a client
  title VARCHAR
  service_type ENUM(sea_fcl, sea_lcl, air, land, clearance, logistics)
  origin_port_id UUID FK → ports
  destination_port_id UUID FK → ports
  commodity_id UUID FK
  cargo_weight DECIMAL
  cargo_volume DECIMAL
  estimated_value DECIMAL
  status ENUM(new, contacted, quoted, negotiation, won, lost)
  sales_person_id UUID FK → users
  expected_close_date DATE
  notes TEXT
  created_at, updated_at, closed_at TIMESTAMP

Table: lead_activities
  id UUID PK
  lead_id UUID FK
  user_id UUID FK
  activity_type ENUM(call, email, meeting, whatsapp, note)
  description TEXT
  scheduled_at TIMESTAMP
  completed_at TIMESTAMP

-- QUOTATIONS / OFFERS
Table: quotations
  id UUID PK
  company_id UUID FK
  quotation_number VARCHAR UNIQUE
  lead_id UUID FK → leads
  client_id UUID FK → clients
  contact_id UUID FK → client_contacts
  validity_date DATE
  service_type ENUM
  origin_port_id, destination_port_id UUID FK → ports
  shipping_line_id UUID FK → shipping_lines
  incoterms VARCHAR(10)          -- EXW, FOB, CIF, etc.
  status ENUM(draft, sent, accepted, rejected, expired)
  total_amount DECIMAL(15,2)
  currency VARCHAR(3)
  notes TEXT
  created_by UUID FK → users
  created_at, sent_at, responded_at TIMESTAMP

Table: quotation_items
  id UUID PK
  quotation_id UUID FK
  item_type ENUM(ocean_freight, local_charges, customs, inland, surcharge, other)
  description VARCHAR
  unit VARCHAR                   -- CBM, KG, Container, BL
  quantity DECIMAL
  unit_price DECIMAL(15,2)
  total_price DECIMAL(15,2)
  currency VARCHAR(3)
  notes TEXT

-- SHIPMENTS / JOBS
Table: shipments
  id UUID PK
  company_id UUID FK
  job_number VARCHAR UNIQUE
  quotation_id UUID FK → quotations
  client_id UUID FK → clients
  shipper_id UUID FK → clients   -- Could be different from billing client
  consignee_id UUID FK → clients
  service_type ENUM
  origin_port_id, destination_port_id UUID FK → ports
  shipping_line_id UUID FK → shipping_lines
  agent_id UUID FK → overseas_agents
  commodity_id UUID FK
  status ENUM(booking, confirmed, in_transit, arrived, delivered, cancelled)
  incoterms VARCHAR(10)
  container_type VARCHAR          -- 20GP, 40GP, 40HC, etc.
  container_count INTEGER
  cargo_weight, cargo_volume DECIMAL
  etd DATE                        -- Estimated Time of Departure
  eta DATE                        -- Estimated Time of Arrival
  atd DATE                        -- Actual
  ata DATE                        -- Actual
  vessel_name VARCHAR
  voyage_number VARCHAR
  bl_number VARCHAR
  created_by UUID FK → users
  operations_person_id UUID FK → users
  created_at, updated_at TIMESTAMP

Table: shipment_status_history
  id UUID PK
  shipment_id UUID FK
  status ENUM
  notes TEXT
  location VARCHAR
  changed_by UUID FK → users
  changed_at TIMESTAMP

Table: shipment_reminders
  id UUID PK
  shipment_id UUID FK
  reminder_type ENUM(etd, eta, bl_expiry, payment_due, document_due, custom)
  due_date TIMESTAMP
  assigned_to UUID FK → users
  is_done BOOLEAN
  notes TEXT

-- CLEARANCE
Table: clearance_entries
  id UUID PK
  company_id UUID FK
  entry_number VARCHAR
  shipment_id UUID FK → shipments
  client_id UUID FK → clients
  port_id UUID FK → ports
  entry_type ENUM(import, export, transit)
  status ENUM(pending, submitted, under_review, released, rejected)
  declaration_date DATE
  release_date DATE
  customs_value DECIMAL(15,2)
  duty_amount DECIMAL(15,2)
  tax_amount DECIMAL(15,2)
  assigned_to UUID FK → users
  notes TEXT

-- DOCUMENTS
Table: documents
  id UUID PK
  company_id UUID FK
  entity_type ENUM(shipment, clearance, client, quotation)
  entity_id UUID
  document_type ENUM(bl, packing_list, invoice, coc, phytosanitary, customs_declaration, pod, other)
  file_name VARCHAR
  file_url VARCHAR                 -- S3/MinIO URL
  file_size INTEGER
  mime_type VARCHAR
  expiry_date DATE
  uploaded_by UUID FK → users
  uploaded_at TIMESTAMP

-- INVOICES
Table: invoices
  id UUID PK
  company_id UUID FK
  invoice_number VARCHAR UNIQUE
  shipment_id UUID FK → shipments
  client_id UUID FK → clients
  invoice_type ENUM(freight, customs, storage, demurrage, other)
  status ENUM(draft, sent, partially_paid, paid, overdue, cancelled)
  issue_date DATE
  due_date DATE
  subtotal, tax_amount, total DECIMAL(15,2)
  currency VARCHAR(3)
  payment_terms VARCHAR
  notes TEXT

Table: invoice_items
  id UUID PK
  invoice_id UUID FK
  description VARCHAR
  quantity DECIMAL
  unit_price DECIMAL(15,2)
  total_price DECIMAL(15,2)

Table: payments
  id UUID PK
  invoice_id UUID FK
  amount DECIMAL(15,2)
  payment_date DATE
  payment_method ENUM(bank_transfer, cheque, cash, online)
  reference_number VARCHAR
  notes TEXT

-- NOTIFICATIONS
Table: notifications
  id UUID PK
  company_id UUID FK
  user_id UUID FK
  type ENUM(reminder, alert, system, assignment, message)
  title VARCHAR
  body TEXT
  link VARCHAR                     -- Deep link to entity
  is_read BOOLEAN
  created_at TIMESTAMP

-- AUDIT LOG
Table: audit_logs
  id UUID PK
  company_id UUID FK
  user_id UUID FK
  action VARCHAR                   -- CREATE, UPDATE, DELETE
  resource VARCHAR
  resource_id UUID
  old_values JSONB
  new_values JSONB
  ip_address VARCHAR
  created_at TIMESTAMP
```

---

## 7. 🔌 API Architecture

### Design Principles
- **RESTful** with consistent naming conventions
- **Versioned**: `/api/v1/`
- **Standardized response envelope**:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20 },
  "message": "ok"
}
```

### Key API Endpoints

```
AUTH
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

CLIENTS
GET    /api/v1/clients                     (filter: type, status, sales_person)
POST   /api/v1/clients
GET    /api/v1/clients/:id
PUT    /api/v1/clients/:id
GET    /api/v1/clients/:id/contacts
POST   /api/v1/clients/:id/contacts
GET    /api/v1/clients/:id/shipments
GET    /api/v1/clients/:id/quotations
GET    /api/v1/clients/:id/invoices

CRM
GET    /api/v1/crm/leads                   (filter: status, sales_person, service)
POST   /api/v1/crm/leads
PUT    /api/v1/crm/leads/:id
POST   /api/v1/crm/leads/:id/activities
POST   /api/v1/crm/leads/:id/convert       (convert to shipment job)

QUOTATIONS
GET    /api/v1/quotations
POST   /api/v1/quotations
GET    /api/v1/quotations/:id
PUT    /api/v1/quotations/:id
POST   /api/v1/quotations/:id/send         (email to client)
POST   /api/v1/quotations/:id/accept
POST   /api/v1/quotations/:id/duplicate

SHIPMENTS
GET    /api/v1/shipments                   (filter: status, type, date_range)
POST   /api/v1/shipments
GET    /api/v1/shipments/:id
PUT    /api/v1/shipments/:id/status
POST   /api/v1/shipments/:id/documents
GET    /api/v1/shipments/:id/history
POST   /api/v1/shipments/:id/reminders

CLEARANCE
GET    /api/v1/clearance
POST   /api/v1/clearance
GET    /api/v1/clearance/:id
PUT    /api/v1/clearance/:id/status

MASTERS
GET/POST/PUT  /api/v1/masters/ports
GET/POST/PUT  /api/v1/masters/shipping-lines
GET/POST/PUT  /api/v1/masters/agents
GET/POST/PUT  /api/v1/masters/commodities

REPORTS
GET    /api/v1/reports/dashboard           (KPI summary)
GET    /api/v1/reports/sales-performance   (by person, period)
GET    /api/v1/reports/shipment-volume     (by service, route, period)
GET    /api/v1/reports/revenue             (by client, period)
GET    /api/v1/reports/reminders           (upcoming deadlines)

AI
POST   /api/v1/ai/ask                      (natural language query)
POST   /api/v1/ai/suggest-pricing         (AI price suggestion)
POST   /api/v1/ai/draft-offer             (AI offer draft)
```

---

## 8. 🔐 Authentication & Authorization

### Strategy
- **JWT Access Token** (15 min expiry) + **Refresh Token** (30 days, stored in DB)
- **HTTP-only cookies** for refresh token (XSS protection)
- **RBAC** (Role-Based Access Control) + **ABAC** (Attribute-Based) for row-level security

### Role Permissions Matrix

| Resource | Super Admin | Admin | Sales Person | Operations | Agent | Customer |
|---|---|---|---|---|---|---|
| All Companies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| All Users | ✅ | ✅ (own company) | ❌ | ❌ | ❌ | ❌ |
| All Clients | ✅ | ✅ | Own only | ❌ | ❌ | ❌ |
| All Quotations | ✅ | ✅ | Own only | View | ❌ | Own only |
| All Shipments | ✅ | ✅ | Own clients | ✅ | Assigned | Own only |
| Financial Data | ✅ | ✅ | Limited | ❌ | ❌ | Own only |
| System Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Multi-Tenancy Isolation
- Every DB query includes `company_id` filter (tenant isolation at ORM level)
- Prisma middleware auto-injects `company_id` from JWT claims
- Row Level Security (RLS) as backup in PostgreSQL

### Security Headers
- CORS with whitelist
- Helmet.js (CSP, HSTS, X-Frame-Options)
- Rate limiting per IP and per user

---

## 9. 🗂️ File / Storage Architecture

### Storage Strategy
- **Provider**: AWS S3 (production) / MinIO (self-hosted option)
- **CDN**: CloudFront for document delivery
- **Access**: Pre-signed URLs (24h expiry for download links)
- **Uploads**: Direct-to-S3 using pre-signed PUT URLs (client uploads directly, no server proxy)

### Folder Structure in S3
```
s3://banna-files/
├── {company_id}/
│   ├── documents/
│   │   ├── shipments/{shipment_id}/
│   │   │   ├── bl_{uuid}.pdf
│   │   │   └── packing_list_{uuid}.pdf
│   │   ├── clearance/{entry_id}/
│   │   │   └── declaration_{uuid}.pdf
│   │   └── clients/{client_id}/
│   │       └── contract_{uuid}.pdf
│   └── avatars/
│       └── {user_id}.jpg
```

### Document Processing Pipeline
```
Client Upload Request
  → API generates presigned S3 URL
  → Client uploads directly to S3
  → S3 triggers Lambda (or webhook)
  → Worker validates file (type, size, virus scan via ClamAV)
  → Creates document record in DB
  → Sends notification to relevant user
```

---

## 10. 🔗 Third-Party Integrations

| Service | Purpose | Provider |
|---|---|---|
| **Email** | Transactional emails (quotes, invoices, OTPs) | SendGrid / Amazon SES |
| **SMS / WhatsApp** | Alerts, OTPs, document sharing | Twilio / WhatsApp Business API |
| **Maps** | Port location display | Google Maps API |
| **Currency** | Live FX rates for multi-currency quotes | Fixer.io / Open Exchange Rates |
| **Vessel Tracking** | Live vessel position & ETA | MarineTraffic API / VesselFinder |
| **Customs Integration** | EDI/XML submission to customs | Egypt Customs ACID system (NAFEZA) |
| **Payment Gateway** | Online invoice payments | Stripe / Paymob (MENA) |
| **Cloud Storage** | Document storage | AWS S3 |
| **Error Tracking** | Bug monitoring | Sentry |
| **Analytics** | Usage analytics | Mixpanel / PostHog |
| **Push Notifications** | Mobile/browser push | Firebase FCM |
| **AI/LLM** | Smart suggestions & assistant | OpenAI GPT-4o |

---

## 11. 🤖 AI / Agent Architecture

### AI Features
1. **Smart Quotation Assistant** — suggests freight rates based on historical data + market
2. **Natural Language Search** — "Show me all LCL shipments from Alexandria to Hamburg last quarter"
3. **Offer Draft Generator** — AI writes professional offer letters in Arabic/English
4. **Reminder Intelligence** — AI predicts follow-up timing based on client patterns
5. **Document Extraction** — OCR + AI extracts data from uploaded B/L, invoices
6. **Anomaly Detection** — flags unusual pricing or status delays

### AI Architecture

```
┌─────────────────────────────────────────────────────┐
│                  AI Module (NestJS)                  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Chat Agent  │  │ Quote Agent  │  │ Doc Agent │ │
│  │ (GPT-4o)    │  │ (GPT-4o +   │  │ (GPT-4o   │ │
│  │             │  │  Rate DB)   │  │  Vision)  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │       │
│         └─────────────────┼─────────────────┘       │
│                           ▼                         │
│              ┌─────────────────────┐                │
│              │   Tool Definitions  │                │
│              │  - search_shipments │                │
│              │  - get_client_info  │                │
│              │  - create_reminder  │                │
│              │  - fetch_rate_card  │                │
│              └──────────┬──────────┘                │
│                         ▼                           │
│              ┌─────────────────────┐                │
│              │   Function Router   │                │
│              │ (calls actual APIs) │                │
│              └─────────────────────┘                │
└─────────────────────────────────────────────────────┘
                          │
              ┌───────────┴──────────┐
              ▼                      ▼
    ┌──────────────────┐   ┌──────────────────┐
    │  Vector Database │   │  Prisma + Postgres│
    │  (pgvector)      │   │  (structured data)│
    │  Rate history,   │   │                  │
    │  Email templates │   │                  │
    └──────────────────┘   └──────────────────┘
```

### RAG (Retrieval-Augmented Generation)
- Historical quotations embedded and stored in **pgvector**
- When sales person asks for pricing suggestion, nearest similar routes/commodities are retrieved
- LLM generates contextual suggestion with reasoning

---

## 12. 📈 Scalability

### Horizontal Scaling Plan

| Component | MVP | Scale-Up |
|---|---|---|
| API Server | Single Node.js instance | Multiple pods (K8s), auto-scaling |
| Database | Single PostgreSQL | Read replicas + connection pooling (PgBouncer) |
| Cache | Single Redis | Redis Cluster |
| File Storage | S3 (inherently scalable) | S3 + CloudFront CDN |
| Queue | BullMQ + Redis | BullMQ cluster mode |
| Search | PostgreSQL full-text | Elasticsearch / OpenSearch |

### Database Partitioning (Future)
- `shipments` table: partition by `created_at` (monthly)
- `audit_logs` table: partition by `created_at` + archive after 2 years

### Multi-Region (Future)
- Primary region: Egypt / UAE
- Read replicas in: KSA, Kuwait
- CDN edge nodes for static assets

---

## 13. 🛡️ Security

### Application Security
- All inputs validated with class-validator + Zod
- SQL injection: Prisma parameterized queries (no raw SQL)
- XSS: Output encoding + Content Security Policy
- CSRF: SameSite cookies + CSRF tokens
- File upload: Type validation, size limits, virus scanning
- Rate limiting: 100 req/min per user, 20 req/min for auth endpoints

### Data Security
- Passwords: bcrypt (cost factor 12)
- Sensitive data: AES-256 encryption at rest for PII fields
- Database: TLS connection required
- S3: Server-side encryption (SSE-S3)
- Secrets: AWS Secrets Manager / HashiCorp Vault

### Compliance
- GDPR-friendly: soft delete, data export, right-to-erasure API
- Egyptian data localization: hosting options in Egypt (AWS Cairo region)
- Audit trail: every create/update/delete logged with user + timestamp

---

## 14. ⚡ Caching Strategy

```
Layer 1: Browser Cache
  - Static assets (JS, CSS, images): 1 year via CDN
  - API responses: Cache-Control headers for safe GETs

Layer 2: CDN Cache (CloudFront)
  - Document downloads: Pre-signed URLs cached at edge
  - Public data (ports list, commodity list): 24h TTL

Layer 3: Redis Application Cache
  - User sessions: 15 min (sliding)
  - Permission matrix per user: 5 min TTL
  - Masters data (ports, shipping lines): 1 hour TTL
  - Dashboard KPI aggregates: 15 min TTL
  - Rate cards / quotation templates: 30 min TTL

Cache Invalidation:
  - Tag-based invalidation (invalidate all cache for entity on update)
  - Event-driven: BullMQ event triggers cache clear
```

---

## 15. 📬 Queues / Background Jobs

### Queue Architecture (BullMQ + Redis)

```
Queues:
├── email-queue
│   ├── send-quotation-email
│   ├── send-invoice-email
│   ├── send-otp-email
│   └── send-reminder-digest (daily)
│
├── notification-queue
│   ├── push-notification
│   ├── whatsapp-message
│   └── sms-alert
│
├── document-queue
│   ├── process-uploaded-doc     (OCR + AI extraction)
│   ├── generate-pdf             (quotation, invoice)
│   └── virus-scan
│
├── ai-queue
│   ├── generate-offer-draft
│   ├── extract-document-data
│   └── compute-price-suggestion
│
├── sync-queue
│   ├── vessel-tracking-sync     (every 2 hours)
│   ├── currency-rates-sync      (every 6 hours)
│   └── customs-status-sync      (every 30 min)
│
└── cleanup-queue
    ├── expire-old-quotations    (daily)
    ├── archive-audit-logs       (monthly)
    └── cleanup-temp-files       (daily)
```

### Scheduled Jobs (Cron)
- **Daily 08:00 EGY**: Send reminder digest email to each sales person
- **Hourly**: Sync vessel tracking data for active shipments
- **Every 6 hours**: Refresh currency exchange rates
- **Daily midnight**: Check quotation validity dates, mark expired
- **Weekly Sunday**: Generate sales performance reports

---

## 16. 🚀 Deployment Architecture

### Infrastructure (AWS)

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  VPC (Private Network)                │  │
│  │                                                       │  │
│  │  ┌─────────────────┐    ┌──────────────────────┐    │  │
│  │  │   Public Subnet  │    │    Private Subnet     │    │  │
│  │  │                 │    │                       │    │  │
│  │  │  Load Balancer  │    │  ECS Fargate (API)   │    │  │
│  │  │  (ALB)          │───▶│  ECS Fargate (Worker)│    │  │
│  │  │                 │    │                       │    │  │
│  │  │  CloudFront CDN │    │  RDS PostgreSQL       │    │  │
│  │  │                 │    │  (Multi-AZ)           │    │  │
│  │  └─────────────────┘    │                       │    │  │
│  │                         │  ElastiCache Redis    │    │  │
│  │                         │                       │    │  │
│  │                         │  S3 (Documents)       │    │  │
│  │                         │                       │    │  │
│  │                         └──────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Route 53 (DNS)  │  ACM (SSL)  │  WAF  │  CloudWatch       │
└─────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
Developer Push
  → GitHub Actions triggered
  → Lint + TypeScript check
  → Unit tests (Jest)
  → Integration tests
  → Docker build
  → Push to ECR (container registry)
  → Deploy to staging (ECS)
  → E2E tests (Playwright)
  → Manual approval gate
  → Deploy to production (ECS rolling update)
  → Health check
  → Slack notification
```

### Environments

| Environment | Purpose | Auto-Deploy |
|---|---|---|
| `development` | Local dev with Docker Compose | Manual |
| `staging` | QA / UAT testing | On PR merge to `main` |
| `production` | Live system | After manual approval |

### Docker Compose (Local Dev)
```yaml
services:
  api: Node.js / NestJS
  worker: BullMQ workers
  postgres: PostgreSQL 16
  redis: Redis 7
  minio: Local S3 alternative
  mailhog: Local email testing
```

---

## 17. 📁 Folder / Project Structure

```
banna/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── stores/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   └── package.json
│   │
│   └── mobile/                 # React Native (Phase 2)
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── ui-kit/                 # Shared UI components
│   └── utils/                  # Shared utilities
│
├── infrastructure/
│   ├── terraform/              # AWS infrastructure as code
│   ├── docker/
│   │   └── docker-compose.yml
│   └── k8s/                    # Kubernetes manifests (future)
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│
├── docs/                       # Technical documentation
├── .env.example
├── turbo.json                  # Turborepo config
└── package.json                # Monorepo root
```

**Monorepo**: Managed with **Turborepo** for optimized builds and caching.

---

## 18. 💻 Technology Choices + Alternatives

| Layer | Chosen | Alternatives | Reason for Choice |
|---|---|---|---|
| **Frontend** | Next.js 14 | Nuxt, Remix, Vite+React | SSR, App Router, ecosystem |
| **Backend** | NestJS | Express, Fastify, Hono | DI, decorators, enterprise-grade |
| **Language** | TypeScript | JavaScript | Type safety across stack |
| **Database** | PostgreSQL | MySQL, MongoDB | Relational + JSONB + pgvector |
| **ORM** | Prisma | TypeORM, Drizzle | Type-safe, great DX |
| **Cache** | Redis | Memcached, DynamoDB | Versatile, BullMQ-native |
| **Queue** | BullMQ | Kafka, RabbitMQ, SQS | Redis-native, simpler ops |
| **Auth** | JWT + Refresh | Session, OAuth only | Stateless, mobile-friendly |
| **Storage** | AWS S3 | GCS, Azure Blob, MinIO | Industry standard, CDN integration |
| **Deployment** | AWS ECS Fargate | Railway, Render, Kubernetes | Managed, scalable, MENA regions |
| **Email** | SendGrid | AWS SES, Resend | Templates, reliability |
| **AI** | OpenAI GPT-4o | Gemini, Claude, Llama3 | Best Arabic language support |
| **Monitoring** | CloudWatch + Sentry | Datadog, Grafana | Cost-effective |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI | Free tier, ecosystem |

---

## 19. 🏗️ MVP vs. Future Architecture

### MVP Scope (Month 1–4)
**Goal**: Working system for one company with core operations

✅ **Include:**
- User auth (JWT, roles: admin, sales, operations)
- Client management + contact persons
- Quotation builder (manual pricing)
- Shipment job tracking (basic status flow)
- Document upload (S3)
- Email notifications (SendGrid)
- Basic dashboard (counts, recent activity)
- Masters: ports, shipping lines, commodities
- Arabic + English UI

❌ **Defer:**
- AI features
- Mobile app
- Overseas agent portal
- Customer self-service portal
- Vessel tracking integration
- Advanced analytics
- Multi-company (SaaS)
- Payment gateway

### Growth Phase (Month 5–9)
- Multi-tenancy (SaaS onboarding)
- AI quotation assistant
- Customer portal
- WhatsApp notifications
- Vessel tracking (MarineTraffic)
- NAFEZA customs integration (Egypt)
- Advanced reports + export

### Scale Phase (Month 10+)
- Mobile app (React Native)
- Overseas agent portal
- Full AI agent (document extraction, NL search)
- API marketplace (3PL integrations)
- Multi-currency + multi-region
- Marketplace for freight rates

---

## 20. 🗓️ Implementation Roadmap

### Phase 0 — Foundation (Weeks 1–2)
- [ ] Monorepo setup (Turborepo)
- [ ] Next.js + NestJS scaffolding
- [ ] PostgreSQL + Prisma schema (core tables)
- [ ] Redis + BullMQ setup
- [ ] Docker Compose local dev
- [ ] GitHub Actions CI skeleton
- [ ] Design system + shadcn/ui setup
- [ ] Auth module (JWT, refresh, roles)

### Phase 1 — Core Modules (Weeks 3–7)
- [ ] Client management (CRUD + contacts)
- [ ] Masters (ports, shipping lines, commodities)
- [ ] Quotation builder + items + PDF generation
- [ ] Quotation email send
- [ ] Shipment/job management
- [ ] Document upload (S3 presigned)
- [ ] Basic notification system

### Phase 2 — CRM + Operations (Weeks 8–11)
- [ ] CRM leads pipeline
- [ ] Offer management
- [ ] Clearance entries module
- [ ] Overseas agents management
- [ ] Reminders + task system
- [ ] Status history tracking
- [ ] Advanced filters across all modules

### Phase 3 — Reports + Portals (Weeks 12–15)
- [ ] Dashboard analytics (KPIs)
- [ ] Sales performance reports
- [ ] Customer self-service portal
- [ ] Invoice generation + payment tracking
- [ ] WhatsApp Business API notifications

### Phase 4 — AI + Integrations (Weeks 16–20)
- [ ] AI quotation assistant (GPT-4o + pgvector)
- [ ] NL search across shipments
- [ ] Document OCR extraction
- [ ] Vessel tracking API
- [ ] Currency exchange rates
- [ ] NAFEZA customs EDI (Egypt)

### Phase 5 — Mobile + Scale (Weeks 21–28)
- [ ] React Native mobile app
- [ ] Push notifications (FCM)
- [ ] Multi-tenant SaaS billing
- [ ] Kubernetes migration
- [ ] Multi-region deployment

---

## 📊 Tech Stack Summary Card

```
┌─────────────────────────────────────────────────────┐
│              BANNA — TECH STACK SUMMARY              │
├─────────────────┬───────────────────────────────────┤
│ Frontend        │ Next.js 14, TypeScript, shadcn/ui  │
│ Backend         │ NestJS, TypeScript, Prisma          │
│ Database        │ PostgreSQL 16, pgvector             │
│ Cache           │ Redis 7                             │
│ Queue           │ BullMQ                              │
│ Storage         │ AWS S3 + CloudFront                 │
│ Auth            │ JWT + Refresh Tokens (Passport.js)  │
│ AI              │ OpenAI GPT-4o + RAG (pgvector)      │
│ Email           │ SendGrid                            │
│ SMS/WhatsApp    │ Twilio / WhatsApp Business API      │
│ Deployment      │ AWS ECS Fargate                     │
│ IaC             │ Terraform                           │
│ Monorepo        │ Turborepo                           │
│ CI/CD           │ GitHub Actions                      │
│ Monitoring      │ Sentry + CloudWatch                 │
│ i18n            │ next-i18next (AR + EN, RTL support) │
└─────────────────┴───────────────────────────────────┘
```
