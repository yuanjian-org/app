## 2026-04-07 - [Brute-force protection for ID verification tokens]
**Vulnerability:** Verification tokens (6-digit codes) were susceptible to brute-force guessing because there was no limit on the number of failed attempts.
**Learning:** Even with rate limiting on token *generation*, the *verification* endpoint must also be protected against multiple incorrect guesses for the same token.
**Prevention:** Always implement a failed attempt counter for short-lived verification codes and invalidate the token after a small number of failures (e.g., 5). Additionally, ensure expiration is checked against the immutable `createdAt` timestamp rather than `updatedAt` to prevent failed attempts from resetting the expiration timer.
