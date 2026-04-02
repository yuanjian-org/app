## 2025-05-15 - [Open Redirect and XSS via callbackUrl]
**Vulnerability:** Redirection parameters (e.g., `callbackUrl`) were not validated, allowing attackers to redirect users to external malicious sites (Open Redirect) or execute arbitrary JavaScript via `javascript:` URLs (XSS).
**Learning:** Redirection logic is a common source of vulnerabilities. Trusting user-provided URLs for redirection without strict validation is dangerous. Standardizing on relative paths and rejecting any input that looks like an absolute or protocol-relative URL is a robust defense.
**Prevention:** Use a centralized utility like `getSafeCallbackUrl` to enforce that all redirection targets are safe relative paths starting with `/` and explicitly rejecting `//`, `/\`, or any other protocol-like prefixes.
