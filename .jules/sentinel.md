## 2024-07-24 - [Hardcoded Fundebug API Key]
 **Vulnerability:** Hardcoded API key for Fundebug in src/fundebug/index.ts
 **Learning:** Third party API keys should never be hardcoded in the codebase, as they can be easily leaked and abused. They should be loaded via environment variables instead.
 **Prevention:** Use environment variables and add them to .env.template to guide users setting up the project locally or in production environments.
