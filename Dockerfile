################################################################################
# START BOILTERPLATE. Directly copied from                                     #
# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile#
#                                                                              #
# DO NOT EDIT BELOW CONTENT. Add customization only after END BIOLTERPLATE     #
################################################################################

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install curl for the cron script
RUN apk add --no-cache curl

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create a place for env vars for cron
RUN touch /app/.env.cron && chown nextjs:nodejs /app/.env.cron

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Include files needed for deployment in the image
COPY --from=builder --chown=nextjs:nodejs /app/docker-compose.yml ./
COPY --from=builder --chown=nextjs:nodejs /app/nginx.conf ./
COPY --from=builder --chown=nextjs:nodejs /app/tools/cronResetDemo.sh ./tools/cronResetDemo.sh

# Set up cron job. We run crond as root, and it will execute the script.
# The script itself will check if it's in demo mode.
# We redirect output to stdout of process 1 so it appears in docker logs.
RUN echo "0 4 * * * . /app/.env.cron; /app/tools/cronResetDemo.sh > /proc/1/fd/1 2>&1" > /var/spool/cron/crontabs/root

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"

# Run both crond and the node server. We use a script to capture env vars for cron.
CMD ["sh", "-c", "env | grep -E 'IS_DEMO|INTEGRATION_AUTH_TOKEN' | sed 's/^/export /' > /app/.env.cron && crond && node server.js"]

#############################
# END BIOLTERPLATE          #
#############################
