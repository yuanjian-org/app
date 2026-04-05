## 2026-04-05 - [Brute-force protection for verification codes]
**Vulnerability:** 6-digit verification codes (SMS/Email) were vulnerable to brute-force attacks as there was no limit on the number of incorrect attempts.
**Learning:** Even with short-lived tokens, 1,000,000 possibilities can be exhausted relatively quickly without rate limiting or attempt limits.
**Prevention:** Implement a `failedAttempts` counter on the token record and delete the token after a small number of failed attempts (e.g., 5).
