## 2026-04-09 - [Brute-force protection for verification tokens]
**Vulnerability:** [Weak protection against brute-force attacks on 6-digit verification codes.]
**Learning:** [The IdToken model lacked a counter for failed attempts, allowing attackers to try many combinations until the token expired. Also, rate limiting by IP only could be bypassed by using multiple IP addresses to target a single phone/email.]
**Prevention:** [Implement a `failedAttempts` counter in the token model, destroy the token after a threshold (e.g., 5 attempts), and rate limit by both IP and target identifier.]
