## 2026-10-21 - Unvalidated Bearer Token in authWebhook Middleware
**Vulnerability:** The `authWebhook` middleware in `src/api/auth.ts` verified that `process.env.WEBHOOK_TOKEN` was defined, but failed to extract or compare the request's Authorization header, allowing unauthenticated requests to pass through to webhook handlers.
**Learning:** Middleware checking environment configuration must also validate incoming request credentials against configured tokens.
**Prevention:** Standardize API integration and webhook token authentication logic using timing-safe comparisons (`crypto.timingSafeEqual`) and strict byte length checks.
