# Reference implementatinon: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
#
# TODO: uncommend "## stage ##" (also in compose files) to restore stage-based
# optimization for build time and image size. Simple uncommenting would cause
# container to miss the "next" binary. Debugging is needed. 
#

FROM node:22-alpine
## stage ## FROM node:22-alpine AS base

ARG env

# Install dependencies only when needed
## stage ## FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies with yarn
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# Rebuild the source code only when needed
## stage ## FROM deps AS builder
WORKDIR /app
COPY . .
## stage ## COPY --from=deps /app/node_modules ./node_modules

RUN yarn run build

# Create the production image, copy all the files and run the app.
## stage ## FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -u 1001 -S nextjs

## stage ## COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next
RUN chown -R nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
## stage ## COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
## stage ## COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
#
# TODO: https://github.com/yuanjian-org/app/issues/366
#
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "start"]
