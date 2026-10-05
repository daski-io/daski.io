# syntax=docker/dockerfile:1
# One base for every stage, pinned by digest: the sandbox and production build
# the same commit days apart, so the base must not drift between them. The
# explicit bookworm tag keeps the Debian package pins below valid if the
# node:22-slim alias moves to a newer Debian. To refresh it when the image scan
# flags the base, run `docker buildx imagetools inspect node:22-bookworm-slim`,
# copy the top-level Digest (the manifest list) here, then rebuild and test the
# image.
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
FROM ${NODE_IMAGE} AS base
# Debian security updates for PCRE2 and Perl in the Node image, the versions the
# gateway and provider images install. The develop image scan
# (release-image.yml) fails on fixable MEDIUM+ findings.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpcre2-8-0=10.42-1+deb12u2 perl-base=5.36.0-7+deb12u4 \
 && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json astro.config.mjs ./
COPY public ./public
COPY src ./src
COPY scripts/release-capabilities.mjs ./scripts/release-capabilities.mjs
ARG RAILWAY_GIT_COMMIT_SHA
ARG SOURCE_SHA=$RAILWAY_GIT_COMMIT_SHA
ENV SOURCE_SHA=$SOURCE_SHA
RUN npm run build && node scripts/release-capabilities.mjs

# Production-only install for the runtime image: keeps it lean and avoids
# shipping the Astro/Vite/React build tooling. It runs here, where npm is
# still present, because the runtime stage removes npm.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS runtime
WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# The runtime executes prebuilt JavaScript only (the start command is
# `node ./dist/server/entry.mjs`). Removing npm/npx drops the package
# manager's bundled dependencies, which carried most of the image's fixable
# advisories.
RUN rm -rf /usr/local/lib/node_modules/npm \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx

ARG RAILWAY_GIT_COMMIT_SHA
ARG SOURCE_SHA=$RAILWAY_GIT_COMMIT_SHA
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
