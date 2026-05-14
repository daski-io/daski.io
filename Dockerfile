# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json astro.config.mjs ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app

# Production-only install for the runtime image: keeps it lean and
# avoids shipping the Astro/Vite/React build tooling.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# The Astro Node adapter (standalone mode) emits a self-contained server
# at dist/server/entry.mjs that listens on $HOST:$PORT.
CMD ["node", "./dist/server/entry.mjs"]
