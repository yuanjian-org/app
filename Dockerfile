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
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

# Move traced node_modules into a separate directory with clamped mtimes so
# its layer digest stays identical across code-only commits and is not
# re-uploaded on every deploy.
RUN yarn build && \
    mkdir -p /app/.next/standalone-deps && \
    mv /app/.next/standalone/node_modules \
      /app/.next/standalone-deps/node_modules && \
    TZ=UTC find /app/.next/standalone-deps -depth \
      -exec touch -h -t 198001010000.00 {} +

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy static repo files before build outputs so app code changes do not
# invalidate these layers.
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs \
  docker-compose.*.yml nginx.*.conf docker-death-logger.sh ./

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone-deps/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
