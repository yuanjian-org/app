## 2025-05-15 - Open Redirect in Authentication and OAuth2 Flows
**Vulnerability:** Open Redirect via `callbackUrl` and `profileCallbackUrl` query parameters.
**Learning:** The application was trusting user-provided redirect destinations in the frontend after successful authentication or profile setup, which could be exploited for phishing.
**Prevention:** Always sanitize redirect URLs using a utility like `getSafeCallbackUrl` that restricts destinations to relative paths (e.g., starting with `/` but not `//` or `/\`). Ensure that internal endpoints (like OAuth2 authorize) provide relative paths for these callbacks.
