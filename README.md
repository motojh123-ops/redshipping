# Banna — Freight Forwarding & Customs Clearance ERP/CRM

A comprehensive SaaS platform for freight forwarding companies managing clients, quotations, shipments, customs clearance, and billing.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma
- **Database**: PostgreSQL 16 (with Row-Level Security)
- **Cache/Queue**: Redis 7 + BullMQ
- **PDF Engine**: Gotenberg
- **Storage**: Cloudflare R2 (S3-compatible)
- **Monorepo**: Turborepo

## Project Structure

```
banna-monorepo/
├── apps/
│   ├── web/          # React + Vite SPA (ERP Dashboard)
│   ├── api/          # NestJS Backend API
│   └── workers/      # Background queue processors
├── packages/
│   └── shared-types/ # Shared TypeScript types & enums
├── docker/           # Docker Compose & configs
└── docs/             # Documentation
```

## Getting Started

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, Gotenberg)
docker compose -f docker/docker-compose.yml up -d

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Architecture

See `docs/` for the full architecture documentation.
