## 2024-10-24 - [CRITICAL] Remove Hardcoded Fundebug API Key
**Vulnerability:** A hardcoded API key for Fundebug was present in `src/fundebug/index.ts`.
**Learning:** Hardcoding API keys exposes them in the source code. For Next.js projects, frontend secrets need to be exposed to the client, but hardcoding them directly into source control is a bad practice.
**Prevention:** Use environment variables (e.g., `NEXT_PUBLIC_FUNDEBUG_API_KEY`) and load them securely at build/runtime. Ensure the required env variables are documented in `.env.template`.
