## 2024-06-17 - Add tooltips to Chakra UI icon-only buttons
**Learning:** Chakra UI `IconButton` components forward their refs, making it extremely easy and safe to wrap them directly in `<Tooltip>` components for better accessibility. This pattern provides immediate visual context for screen readers and mouse users alike without disrupting the layout or requiring custom styles.
**Action:** When creating or modifying components that use icon-only buttons (like edit, delete, confirm, cancel), always wrap them with an appropriate `<Tooltip label="...">`.
