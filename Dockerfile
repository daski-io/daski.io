# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

# `serve` is a tiny static file server with built-in SPA fallback (--single).
# Pinned to keep the install reproducible and the runtime image lean.
RUN npm install -g serve@14.2.4

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080
# Railway sets $PORT; default to 8080 for local docker runs.
CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]
