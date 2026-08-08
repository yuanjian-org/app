## 2024-05-18 - [Hardcoded Fundebug API Key]
**Vulnerability:** A hardcoded API key for Fundebug error tracking was found in `src/fundebug/index.ts`.
**Learning:** Even third-party service keys (like error tracking or analytics) should not be hardcoded in the repository. It can allow unauthorized usage of the API quota or exposing telemetry endpoints.
**Prevention:** Always use environment variables for any API keys or secrets. For frontend code in Next.js, use `NEXT_PUBLIC_` prefixed variables and document them in `.env.template`.
