## 2026-03-19 - Missing Authorization Check in Summary Update

**Vulnerability:** Insecure Direct Object Reference (IDOR) in the `update` procedure of the summaries tRPC router. Any authenticated user could modify any meeting summary by providing its `transcriptId` and `key`, as the endpoint lacked permission checks.

**Learning:** The `list` procedure correctly implemented authorization by loading the associated group and checking permissions, but the `update` procedure had a `TODO` comment where the check should have been. This inconsistency allowed a significant security gap.

**Prevention:** Always verify that all CRUD operations on a resource (not just read operations) implement consistent authorization logic. Refactoring core logic into exported implementation functions (`*Impl`) that accept a user context and a transaction facilitates both code reuse for security checks and easier unit testing.

## 2026-03-20 - Mass Assignment in User State Update

**Vulnerability:** Mass Assignment in `setUserState`. Any authenticated user could update sensitive exam completion dates (`commsExam`, `handbookExam`, `menteeInterviewerExam`) in their `state` field, bypassing compliance checks used for access control in the UI and task scheduling.

**Learning:** The `setUserState` procedure blindly merged user-provided input into the database `state` JSON object. Even if fields appear "informational" or for "UI state", they can be misused if the system relies on them for logic or compliance.

**Prevention:** Explicitly filter or whitelist user-provided object fields before merging them into database records. For sensitive status changes (like passing an exam), use dedicated procedures that verify the action (e.g., scoring the exam) rather than allowing direct state updates.
