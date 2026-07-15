## 2024-11-12 - Keyboard accessibility for QuestionIconTooltip
**Learning:** In Chakra UI, a `<Tooltip>` requires its child element to be focusable to display via keyboard navigation. Non-interactive elements like `<QuestionIcon>` or standard SVGs don't receive focus by default.
**Action:** When wrapping a non-interactive icon in a `<Tooltip>`, add `tabIndex={0}` to the icon element to ensure keyboard accessibility.
