## 2025-02-18 - [Fix IDOR in map assessments API]
**Vulnerability:** Missing Authorization / Insecure Direct Object Reference (IDOR) on `createLandmarkAssessment` and `listLandmarkAssessments` trpc routes where users could create and view assessments for other users without proper role verification.
**Learning:** TRPC endpoints accepting a `userId` explicitly in the input payload do not automatically enforce ownership unless explicitly coded.
**Prevention:** Always verify that `ctx.me.id === input.userId` or validate that `ctx.me.roles` includes appropriate privileged roles (e.g. `UserManager`, `MentorshipAssessor`) when allowing operations on a target user ID.
