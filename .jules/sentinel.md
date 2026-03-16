## 2025-05-15 - Secure IP Detection and Token Comparison
**Vulnerability:** IP spoofing via X-Forwarded-For and timing attacks on integration tokens.
**Learning:** The application's `ip()` middleware previously trusted the `X-Forwarded-For` header entirely, allowing clients to spoof their source IP and bypass rate limits. Additionally, string comparison for authentication tokens was vulnerable to timing attacks.
**Prevention:** In an architecture using Nginx as a trusted proxy, always extract the *last* IP address from the `X-Forwarded-For` header to identify the real client. Use `crypto.timingSafeEqual` for all security-sensitive token comparisons, ensuring both buffers have equal length before comparison.
