## 2025-05-15 - [Security Enhancement] Missing Security Headers
**Vulnerability:** The application was missing standard security headers such as `X-Frame-Options`, `X-Content-Type-Options`, and `Strict-Transport-Security`.
**Learning:** Next.js applications do not include these headers by default unless explicitly configured in `next.config.js`.
**Prevention:** Always implement a `headers()` function in `next.config.js` to enforce defense-in-depth security headers across all routes.
