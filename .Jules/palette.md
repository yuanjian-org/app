## 2024-05-18 - Missing Tooltips on IconButtons
**Learning:** Found several `IconButton` instances in the app (like editing users, managing orgs, and the mobile sidebar menu) that lacked a `Tooltip` wrapper, making their purpose less accessible to screen reader users and non-obvious on hover.
**Action:** Wrapped `IconButton` components with Chakra UI `Tooltip` and provided descriptive labels in the primary language (Chinese). Always verify that custom icon-only buttons include hover explanations for better UX and accessibility.
