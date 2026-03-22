## 2026-03-19 - Missing Authorization Check in Summary Update

**Vulnerability:** Insecure Direct Object Reference (IDOR) in the `update` procedure of the summaries tRPC router. Any authenticated user could modify any meeting summary by providing its `transcriptId` and `key`, as the endpoint lacked permission checks.

**Learning:** The `list` procedure correctly implemented authorization by loading the associated group and checking permissions, but the `update` procedure had a `TODO` comment where the check should have been. This inconsistency allowed a significant security gap.

**Prevention:** Always verify that all CRUD operations on a resource (not just read operations) implement consistent authorization logic. Refactoring core logic into exported implementation functions (`*Impl`) that accept a user context and a transaction facilitates both code reuse for security checks and easier unit testing.

## 2026-03-20 - Authorization Bypass via Utility Function in User Update

**Vulnerability:** Authorization bypass in `users.update` tRPC mutation. While the mutation explicitly restricted `email` and `phone` updates to `UserManager` roles at the end of the function, it unintentionally allowed these fields to be updated by anyone because they were passed to the `checkAndComputeUserFields` utility function, which returned them for inclusion in the user model update.

**Learning:** Security checks that rely on filtering fields at the end of a function can be bypassed if intermediate helper functions or object spreads re-introduce those fields. This "shadowing" of authorization logic is particularly dangerous when using ORMs like Sequelize where the model's `update` method accepts a merged object.

**Prevention:** Implement authorization checks as early as possible and validate input against existing database state before processing. When using utility functions to compute fields, ensure they only receive the data they are authorized to process, or explicitly filter their output before applying it to the database model. Handle partial updates by explicitly checking if fields are `undefined`.
