## 2025-05-15 - [IdToken Brute Force & Rate Limit Protection]
**Vulnerability:** 6-digit verification codes were vulnerable to brute-force
attacks within their 5-minute validity window. Rate limiting was also
per-IP only, allowing distributed attacks on a single identifier.
**Learning:** Short verification codes require strict attempt limits. Using
`updatedAt` for expiration can be bypassed if the record is updated
(e.g., to increment a counter), making `createdAt` the safer choice.
**Prevention:** Track failed attempts on sensitive tokens and enforce a
hard limit (e.g., 5). Implement rate limits that consider both the
source IP and the target identifier. Use idempotent SQL migrations
for safe production deployments.
