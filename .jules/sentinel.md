## 2025-05-15 - [Security Enhancement] Administrative State Override with RBAC

**Vulnerability:** Previously, the `setMyState` endpoint was strictly limited to self-service updates. While it had a secure whitelist to prevent users from self-certifying exams (e.g., `commsExam`), there was no secure way for administrators to update these fields if a user had completed an exam through an out-of-band process or if data correction was needed.

**Learning:** Implementing security whitelists is essential, but they must be paired with administrative overrides that are protected by proper Role-Based Access Control (RBAC). A common pitfall is to either keep the whitelist too rigid (blocking legitimate admin actions) or to make it too permissive (introducing IDOR or mass assignment vulnerabilities).

**Prevention:** When implementing state-modifying endpoints:
1. Use Zod (or similar) to enforce a strict schema for all inputs.
2. Implement a whitelist for regular users to prevent unauthorized modification of sensitive internal fields.
3. Provide an administrative path (e.g., an optional `userId` parameter) that is explicitly guarded by a role check (e.g., `UserManager`).
4. Allow administrators to bypass the whitelist when updating other users' states, but still enforce the core Zod schema to prevent arbitrary data injection.
