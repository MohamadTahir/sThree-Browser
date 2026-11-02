# syntax=docker/dockerfile:1.7
#
# Web build of sThree Browser: a static site served by static-web-server
# (a single Rust binary, https://static-web-server.net). There is no
# application server. All S3 traffic goes from the user's browser straight
# to the bucket, so the container never handles credentials.

# ---- build ----------------------------------------------------------------
FROM node:26-alpine AS builder
# Node 25+ no longer ships corepack; install the pnpm version pinned in
# package.json "packageManager" directly.
RUN npm install -g pnpm@10.33.2 && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
# Production build: static export to out/, strict CSP (see next.config.js).
ENV NODE_ENV=production
RUN pnpm build

# ---- runtime --------------------------------------------------------------
# Scratch-based image: just the static-web-server binary, no shell or OS.
FROM joseluisq/static-web-server:2.44.1 AS runner

LABEL org.opencontainers.image.title="sThree Browser" \
      org.opencontainers.image.description="Browse S3 buckets with credentials that never leave your device" \
      org.opencontainers.image.source="https://github.com/MohamadTahir/sThree-Browser" \
      org.opencontainers.image.licenses="MIT"

COPY sws.toml /etc/sws.toml
COPY --from=builder /app/out /public

ENV SERVER_CONFIG_FILE=/etc/sws.toml
# The base image runs as root; use an unprivileged uid (port 3000 needs none).
USER 65534:65534
EXPOSE 3000
