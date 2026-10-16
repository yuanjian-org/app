## 2025-05-18 - Keyed Pairwise User ID Hashing for OAuth2 IdP

**Vulnerability:**
`hashUserIdForClient` previously used plain `crypto.createHash("sha256")` on `clientId\0userId`, allowing malicious clients to perform offline dictionary/brute-force attacks to map and correlate user IDs.

**Learning:**
Pairwise user identifiers in OAuth2/OIDC must be keyed with a secret (such as `NEXTAUTH_SECRET`) to prevent third parties from computing expected subject IDs offline.

**Prevention:**
Always use `crypto.createHmac("sha256", secret)` for pairwise subject identifier generation in OIDC implementations.
