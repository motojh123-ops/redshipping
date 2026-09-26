# syntax=docker/dockerfile:1
# ==============================================================================
# RED SHIPPING / Banna ERP ??? NestJS API (monorepo-aware production image)
#
#   Build: docker build -f apps/api/Dockerfile -t banna-api .
#   Run:   docker run -p 4000:4000 \
#            -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
#            -e JWT_SECRET="..." -e JWT_REFRESH_SECRET="..." banna-api
#
# On boot: applies Prisma migrations ??? seeds the company/admin accounts
# (idempotent; disable with -e SEED_DB=false) ??? starts the API on $PORT (4000).
# ==============================================================================

# ?????? Stage 1: build (full toolchain + dev dependencies) ????????????????????????????????????????????????????????????????????????
FROM node:20-slim AS build
WORKDIR /repo

# Install workspace dependencies first (layer-cache friendly)
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

# Build shared-types ??? generate the Prisma client ??? build the API
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN npm run -w packages/shared-types build \
 && npm run -w apps/api db:generate \
 && npm run -w apps/api build \
 && cd apps/api \
 && npx tsc prisma/seed.ts \
      --esModuleInterop --module commonjs --target ES2022 \
      --moduleResolution node --skipLibCheck --outDir dist-seed

# ?????? Stage 2: production runtime ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
FROM node:20-slim
WORKDIR /repo
# PORT is intentionally NOT pinned here so every platform controls it:
#   Render/Claw inject PORT automatically; Hugging Face Spaces sets PORT=7860;
#   locally/main.ts falls back to 4000 when PORT is not provided.
ENV NODE_ENV=production \
    SEED_DB=true

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

# Build artifacts (API dist, compiled seed, shared-types dist, Prisma schema)
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/dist-seed apps/api/dist-seed
COPY --from=build /repo/packages/shared-types/dist packages/shared-types/dist
COPY apps/api/prisma apps/api/prisma

# Production dependencies only (API + shared-types workspaces)
RUN npm ci --omit=dev --workspace apps/api --workspace packages/shared-types

# Generated Prisma client + matching CLI copied from the build stage
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /repo/node_modules/prisma ./node_modules/prisma

EXPOSE 4000
CMD ["sh", "-c", "APP_DB=\"$DATABASE_URL\"; if [ -n \"$DIRECT_DATABASE_URL\" ]; then DATABASE_URL=\"$DIRECT_DATABASE_URL\"; fi; npx --no-install prisma migrate deploy --schema=apps/api/prisma/schema.prisma && if [ \"$SEED_DB\" = \"true\" ]; then node apps/api/dist-seed/seed.js; fi; DATABASE_URL=\"$APP_DB\"; exec node apps/api/dist/main.js"]
