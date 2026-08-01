## 2024-08-01 - Add Security Headers to next.config.js
**Vulnerability:** Next.js application was missing standard HTTP security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
**Learning:** Next.js configurations can easily omit basic security headers if not explicitly configured in `next.config.js`. Adding these headers natively in Next.js acts as a strong layer of defense.
**Prevention:** Implement standard security headers in base `next.config.js` via the `headers()` async function for all routes `/(.*)`.
