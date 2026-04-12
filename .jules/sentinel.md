## 2024-05-18 - Prevent Reverse Tabnabbing
**Vulnerability:** External links using `target="_blank"` without `rel="noopener noreferrer"` can allow the newly opened tab to hijack the original tab via `window.opener`.
**Learning:** This is a widespread pattern in React/Next.js codebases. Using a global search and replace combined with auto-formatting is the most effective way to secure these links globally.
**Prevention:** Always include `rel="noopener noreferrer"` on any anchor tag or NextLink that opens in a new tab. Ideally, configure the linter (e.g., eslint-plugin-react) to enforce this automatically.
