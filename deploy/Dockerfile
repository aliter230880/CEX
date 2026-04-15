# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-slim AS frontend-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# Copy entire monorepo (needed for workspace deps)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build frontend with production settings
ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=3000

RUN pnpm --filter @workspace/cex-exchange run build

# ─── Stage 2: Build API server ────────────────────────────────────────────────
FROM node:22-slim AS api-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests for production deps install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY .npmrc* ./
COPY lib/ lib/
COPY artifacts/api-server/package.json artifacts/api-server/package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy compiled API server
COPY --from=api-builder /workspace/artifacts/api-server/dist ./dist

# Copy built frontend — Express serves it at /app/public
COPY --from=frontend-builder /workspace/artifacts/cex-exchange/dist/public ./public

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_DIST=/app/public

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
