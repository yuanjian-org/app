## 2026-09-25 - [Missing Security Headers in Next.js config]
**Vulnerability:** Next.js application was missing standard security headers (Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** The default Next.js configuration doesn't automatically include security headers. They must be explicitly defined in `next.config.js` using the `headers` async function. This is a common architectural gap in Next.js apps.
**Prevention:** Always define security headers in `next.config.js` for new Next.js projects to prevent common web vulnerabilities like Clickjacking and MIME type sniffing.
