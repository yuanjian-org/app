## 2026-03-19 - Missing Authorization Check in Summary Update

**Vulnerability:** Insecure Direct Object Reference (IDOR) in the `update` procedure of the summaries tRPC router. Any authenticated user could modify any meeting summary by providing its `transcriptId` and `key`, as the endpoint lacked permission checks.

**Learning:** The `list` procedure correctly implemented authorization by loading the associated group and checking permissions, but the `update` procedure had a `TODO` comment where the check should have been. This inconsistency allowed a significant security gap.

**Prevention:** Always verify that all CRUD operations on a resource (not just read operations) implement consistent authorization logic. Refactoring core logic into exported implementation functions (`*Impl`) that accept a user context and a transaction facilitates both code reuse for security checks and easier unit testing.
