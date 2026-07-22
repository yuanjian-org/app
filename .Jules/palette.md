## 2024-07-22 - Keyboard Access for Custom Link Buttons
**Learning:** Chakra UI `<Link>` components functioning as buttons (with `onClick` but no `href`) lack native button semantics and keyboard accessibility. Screen readers ignore them as interactive elements, and users cannot trigger them with "Enter" or "Space".
**Action:** When using `<Link>` (or other non-native interactive elements) as buttons, always explicitly implement `role="button"`, `tabIndex={0}`, an appropriate `aria-label`, and an `onKeyDown` handler to capture Enter/Space inputs.
