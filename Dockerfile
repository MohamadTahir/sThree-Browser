# syntax=docker/dockerfile:1.7
#
# Web build of sThree Browser. The server only serves the static UI and
# /api/health; all S3 traffic goes from the user's browser straight to the
# bucket, so the container never handles credentials.

FROM node:26-alpine AS base
# Node 25+ no longer ships corepack; install the pnpm version pinned in
# package.json "packageManager" directly.
RUN npm install -g pnpm@10.33.2 && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1

# ---- dependencies ---------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build ----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Production build: strict CSP without 'unsafe-eval' (see next.config.js)
ENV NODE_ENV=production
RUN pnpm build

# ---- runtime --------------------------------------------------------------
FROM node:26-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="sThree Browser" \
      org.opencontainers.image.description="Browse S3 buckets with credentials that never leave your device" \
      org.opencontainers.image.source="https://github.com/MohamadTahir/sThree-Browser" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Standalone server + traced node_modules (Next.js "standalone" output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
