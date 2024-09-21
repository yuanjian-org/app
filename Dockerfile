# Reference implementatinon: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22-alpine
## FROM node:22-alpine AS base
ARG env

# 1. Install dependencies only when needed
## FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies with yarn
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# 2. Rebuild the source code only when needed
## FROM deps AS builder
WORKDIR /app
COPY . .
## COPY --from=deps /app/node_modules ./node_modules

RUN yarn run build

# 3. Run tests.
# It needs database connection which isn't available at build time.
# RUN yarn test

# 4. Create the production image, copy all the files and run the app.
## FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -u 1001 -S nextjs

## COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
## RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
## COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
## COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME "0.0.0.0"

CMD ["yarn", "start"]