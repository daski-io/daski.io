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
ENV PORT=8080
EXPOSE 8080
# `serve` reads $PORT from the environment when no -l flag is given, so this
# works both locally (PORT=8080 default above) and on Railway (where $PORT
# is injected by the platform). The exec form skips a shell entirely, so
# Railway's startCommand override stays predictable.
CMD ["serve", "-s", "dist"]
