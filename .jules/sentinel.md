## 2025-02-28 - Removed hardcoded API key for Fundebug
**Vulnerability:** Found a hardcoded API key for the Fundebug monitoring service in `src/fundebug/index.ts`.
**Learning:** External service API keys must not be hardcoded in the codebase, as they could be exposed in the frontend bundle or version control history. This is true even if the key is intended to be public, to allow for external configuration management per-environment (dev/staging/prod).
**Prevention:** Always use environment variables for API keys and secrets. Use the `NEXT_PUBLIC_` prefix for variables that need to be injected into the frontend client bundle during build time.
