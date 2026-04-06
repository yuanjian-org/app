## 2025-05-15 - [Brute-force protection for ID tokens]
**Vulnerability:** The application was missing a failure counter for ID tokens, allowing for brute-force attacks on the 6-digit verification codes.
**Learning:** Even with short-lived tokens, an attacker with a high-throughput connection can potentially guess a 6-digit code within the 5-minute validity window.
**Prevention:** Implement a `failedAttempts` counter and invalidate tokens after a fixed number of failures (e.g., 5 attempts). Always reload the model instance after incrementing the counter to ensure you're working with the latest database state before checking the limit.
