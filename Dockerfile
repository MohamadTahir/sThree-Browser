FROM node:24-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --outDir public

RUN echo "nobody:x:1001:1001:nobody:/:" >/etc_passwd
RUN chown -R 1001:1001 /app/public


FROM joseluisq/static-web-server:2-alpine

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /etc_passwd /etc/passwd

ENV SERVER_LOG_LEVEL=info
ENV SERVER_PORT=8888
ENV SERVER_ROOT=/app/public
ENV SERVER_FALLBACK_PAGE=./public/index.html

USER nobody

EXPOSE 8888
