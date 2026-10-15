## 2025-05-18 - Buffer Allocation DoS in Timing-Safe String Comparisons
**Vulnerability:** Passing unvalidated JSON body properties (such as numbers) to `Buffer.from()` in timing-safe equality checks causes Node.js to interpret numbers as buffer byte allocation sizes, risking DoS or unexpected exceptions.
**Learning:** `Buffer.from(number)` allocates an uninitialized/zero-filled buffer of size `number` rather than converting the number to a string representation.
**Prevention:** Always perform type checking (`typeof val === "string" ? val : ""`) on untrusted inputs before passing them to `Buffer.from()`.
