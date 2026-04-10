## 2025-05-15 - Brute-force protection for OTP tokens
**Vulnerability:** 6-digit verification tokens could be brute-forced as there was no limit on failed attempts.
**Learning:** Checking for token existence by both identifier and token string makes it impossible to track failed attempts for a specific identifier's active token.
**Prevention:** Query by identifier first, then validate the token string and increment a failure counter on mismatch. Use `createdAt` for expiration to prevent counter updates from extending token life.
