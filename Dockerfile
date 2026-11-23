# Content templated from https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile#

FROM node:26-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
# Node.js 26 no longer bundles yarn or corepack.
# Install yarn via npm for dependency installation.
RUN npm install -g yarn
WORKDIR /app

# Skip downloading the Cypress browser binary during Docker builds.
ENV CYPRESS_INSTALL_BINARY=0

# Install dependencies based on the preferred package manager and clean the
# Yarn tarball cache so cached BuildKit layers fit within GHA's 10 GB cap.
COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile && yarn cache clean

# Rebuild the source code only when needed. Reuse deps directly to avoid
# duplicating node_modules into a second cached BuildKit layer.
FROM deps AS builder
WORKDIR /app

# Copy only Next.js build inputs so nginx/docker-compose/script edits do not
# invalidate `yarn build`.
COPY next.config.js next-i18next.config.js tsconfig.json build.env.* ./
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Lint and typecheck run once in the CI `test` job before `build`.
ENV DOCKER_BUILD=1

ARG NEXT_PUBLIC_WHITE_LABEL
ENV NEXT_PUBLIC_WHITE_LABEL=$NEXT_PUBLIC_WHITE_LABEL

RUN if [ -f "build.env.$NEXT_PUBLIC_WHITE_LABEL" ]; then \
      cp "build.env.$NEXT_PUBLIC_WHITE_LABEL" .env; \
    fi

# If English is not enabled, remove I18N-MARKER line from next.config.js.
RUN if [ ! -f .env ] || \
       ! grep -q '^NEXT_PUBLIC_ENABLE_ENGLISH=true' .env; then \
      sed -i '/I18N-MARKER/d' next.config.js; \
    fi

# Stage runtime artifacts into `/out`, dropping duplicate `public/`, build-only
# `*.nft.json` traces, and `.next/cache` (~680 MB) so `mode=max` GHA cache
# exports stay small. Clamp mtimes on vendor layers (`standalone-deps`,
# `standalone-vendor`, `static-vendor`) so unchanged layers keep identical
# digests across code commits and white labels.
RUN yarn build && \
    rm -rf /app/.next/standalone/public && \
    find /app/.next/standalone -name '*.nft.json' -delete && \
    mkdir -p \
      /out/standalone-deps \
      /out/standalone-vendor/.next/server/chunks \
      /out/standalone-chunks/.next/server \
      /out/static-vendor/chunks && \
    mv /app/.next/standalone/node_modules \
      /out/standalone-deps/node_modules && \
    for f in /app/.next/standalone/.next/server/chunks/vendor-*.js; do \
      [ -e "$f" ] || continue; \
      mv "$f" /out/standalone-vendor/.next/server/chunks/; \
    done && \
    mv /app/.next/standalone/.next/server/chunks \
      /out/standalone-chunks/.next/server/chunks && \
    mv /app/.next/standalone /out/standalone && \
    for f in /app/.next/static/chunks/*.js; do \
      [ -e "$f" ] || continue; \
      mv "$f" /out/static-vendor/chunks/; \
    done && \
    if [ -d /app/.next/static/media ]; then \
      mv /app/.next/static/media /out/static-vendor/media; \
    fi && \
    mv /app/.next/static /out/static && \
    rm -rf /app/.next && \
    TZ=UTC find \
      /out/standalone-deps \
      /out/standalone-vendor \
      /out/static-vendor \
      -depth -exec touch -h -t 198001010000.00 {} +

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set up non-root user and writable `.next` directory for prerender cache.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir .next && \
    chown nextjs:nodejs .next

# Copy static repo files before build outputs so app code changes do not
# invalidate these layers.
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs \
  docker-compose.*.yml nginx.*.conf docker-death-logger.sh ./

# Copy mtime-clamped vendor layers before app layers so unchanged vendor blobs
# hit BuildKit cache and skip registry upload via HEAD check.
COPY --from=builder --chown=nextjs:nodejs /out/standalone-deps/ ./
COPY --from=builder --chown=nextjs:nodejs /out/standalone-vendor/ ./
COPY --from=builder --chown=nextjs:nodejs /out/static-vendor/ ./.next/static/

# Split remaining app outputs across three small layers so BuildKit uploads
# them concurrently across separate TCP streams.
COPY --from=builder --chown=nextjs:nodejs /out/standalone-chunks/ ./
COPY --from=builder --chown=nextjs:nodejs /out/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /out/static/ ./.next/static/

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
