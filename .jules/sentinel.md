## 2026-04-04 - [IdToken Brute-force and Rate-Limiting Protection]
**Vulnerability:** Weak 6-digit ID tokens were susceptible to brute-force attacks as they were only deleted on expiration or success. Additionally, rate limiting only considered the requester's IP, allowing SMS/Email bombing from multiple IPs against a single target.
**Learning:** Security tokens with low entropy (like 6-digit numeric codes) MUST have a failed attempt threshold to prevent online brute-force. Rate limiting should also be multi-dimensional, tracking both the actor (IP) and the target (phone/email).
**Prevention:** Always implement a `failedAttempts` counter for verification codes and ensure rate limits check both `ip` and the target identifier.
