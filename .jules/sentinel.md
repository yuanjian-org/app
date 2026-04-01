## 2025-05-14 - [Open Redirect in Callback URLs]
**Vulnerability:** Open Redirect and XSS via `callbackUrl` parameter.
**Learning:** Redirect parameters like `callbackUrl` can be abused to redirect users to malicious domains if not strictly validated to be local paths. Bypasses include protocol-relative URLs (`//evil.com`) and backslash tricks (`/\evil.com`).
**Prevention:** Always validate redirection URLs using a strict utility like `getSafeCallbackUrl` that ensures the path starts with a single `/` and is not followed by another `/` or `\`.
