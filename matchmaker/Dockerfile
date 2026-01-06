# Matchmaker Dockerfile
# Built from root context: docker build -f matchmaker/Dockerfile .
# Uses node:20-slim (Debian) instead of Alpine because Temporal SDK requires glibc

FROM node:20-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app/matchmaker

# Copy package files first
COPY matchmaker/package.json matchmaker/pnpm-lock.yaml ./

# Copy Prisma schema
COPY application/prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client (schema is now at ./prisma/schema.prisma)
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

# Builder stage
FROM base AS builder
WORKDIR /app/matchmaker

# Copy dependencies (entire node_modules with generated Prisma client)
COPY --from=deps /app/matchmaker/node_modules ./node_modules

# Copy source code
COPY matchmaker/src ./src
COPY matchmaker/lib ./lib
COPY matchmaker/tsconfig.json ./
COPY matchmaker/package.json ./

# Copy Prisma schema for runtime
COPY --from=deps /app/matchmaker/prisma ./prisma

# Runner stage
FROM node:20-slim AS runner

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user with proper home directory
RUN groupadd --system --gid 1001 temporal && \
    useradd --system --uid 1001 --gid temporal --create-home worker

# Copy application
COPY --from=builder --chown=worker:temporal /app/matchmaker ./

USER worker

# Use tsx via node --import
CMD ["node", "--import", "tsx", "src/worker.ts"]
