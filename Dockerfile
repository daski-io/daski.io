# syntax=docker/dockerfile:1
# One base for both stages, pinned by digest: the sandbox and production build
# the same commit days apart, so the base must not drift between them. To
# refresh it, run `docker buildx imagetools inspect node:22-slim`, copy the
# top-level Digest (the manifest list) here, then rebuild and test the image.
ARG NODE_IMAGE=node:22-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json astro.config.mjs ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

# Production-only install for the runtime image: keeps it lean and
# avoids shipping the Astro/Vite/React build tooling.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

ARG SOURCE_SHA
ENV RELEASE_SOURCE_SHA=$SOURCE_SHA
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
# Public gateway hostnames resolve to IPv6 addresses too, but the container has
# no public IPv6 egress. Prefer IPv4 so Node does not spend its 250 ms
# happy-eyeballs attempt on an unreachable address before a fetch. Private
# networking (*.railway.internal) is IPv6-only and unaffected.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
EXPOSE 8080

# The Astro Node adapter (standalone mode) emits a self-contained server
# at dist/server/entry.mjs that listens on $HOST:$PORT.
CMD ["node", "./dist/server/entry.mjs"]
