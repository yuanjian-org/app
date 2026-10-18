## 2025-05-18 - Webhook Middleware Missing Header Token Validation

**Vulnerability:**
`authWebhook` middleware in `src/api/auth.ts` checked for the presence of `process.env.WEBHOOK_TOKEN` but failed to extract or compare the `authorization` header token from `ctx.req`, allowing unauthenticated requests to pass through to webhook routes.

**Learning:**
Middleware checks must validate the request parameters/headers (`ctx.req`), not just environment variable existence.

**Prevention:**
Always extract bearer tokens from `ctx.req.headers["authorization"]` and use timing-safe comparison (`crypto.timingSafeEqual`) after checking buffer byte lengths.
