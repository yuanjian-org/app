FROM node:18-alpine AS base
ARG env

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies with yarn
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN yarn build

# 3. Run tests.
RUN yarn test

# 4. Create the production image, copy all the files and run the app.
FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME localhost

CMD ["yarn", "start"]