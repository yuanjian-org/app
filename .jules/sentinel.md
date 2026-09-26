## 2024-05-24 - [Hardcoded Fundebug API Key]
**Vulnerability:** A hardcoded API key for Fundebug was found in `src/fundebug/index.ts`.
**Learning:** Third-party tracking or error reporting services often require API keys for initialization. Developers might hardcode them for simplicity, exposing secrets to anyone with access to the source code or build artifacts.
**Prevention:** Always use environment variables (e.g., `NEXT_PUBLIC_*` for frontend services) to inject API keys. Ensure these variables are documented in `.env.template` so new developers know what is required.
