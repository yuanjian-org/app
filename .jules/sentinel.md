## 2025-02-18 - Missing Standard Security Headers
**Vulnerability:** The Next.js application was missing standard HTTP security headers (like Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security) in its response, which is a key defense-in-depth measure against common web vulnerabilities (like Clickjacking and MIME sniffing).
**Learning:** Next.js applications do not include comprehensive security headers by default; they must be explicitly configured in `next.config.js` via the `headers()` function.
**Prevention:** Always include a `headers()` block with a robust set of security headers in `next.config.js` for all new Next.js projects to enforce strict security policies at the framework level.
