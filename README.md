# Banna — Freight Forwarding & Customs Clearance ERP/CRM

A comprehensive SaaS platform for freight forwarding companies managing clients, quotations, shipments, customs clearance, and billing.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma
- **Database**: PostgreSQL 16 (Multi-tenant scoped queries via Prisma)
- **Cache/Queue**: Redis 7 + BullMQ
- **PDF Engine**: Gotenberg
- **Storage**: Cloudflare R2 (S3-compatible)
- **Monorepo**: Turborepo

## Project Structure

```
banna-monorepo/
├── apps/
│   ├── web/          # React + Vite SPA (TanStack Query + RHF + Zod)
│   ├── api/          # NestJS Backend API (RBAC + Validation Pipes)
│   └── workers/      # Background queue processors (BullMQ)
├── packages/
│   └── shared-types/ # Shared Zod schemas, TypeScript types & enums
├── docs/             # Architecture, domain specifications, and assets
└── docker-compose.yml# Local infrastructure (Postgres 16, Redis, Gotenberg)
```

## Getting Started

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, Gotenberg)
docker compose up -d

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Architecture & Documentation

See [docs/](file:///docs) for full architecture blueprints, integration manuals, and domain specifications:
- `docs/banna_master_architecture.md`
- `docs/architecture_review.md`
- `docs/INTEGRATION_DOCUMENTATION.md`
