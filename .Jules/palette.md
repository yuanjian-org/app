## 2024-05-15 - Missing Keyboard Accessibility for Custom Buttons
**Learning:** Found multiple instances where non-interactive elements (like Chakra UI `<Link>` or `<HStack>`) were used as buttons (only having an `onClick` handler), making them inaccessible via keyboard navigation.
**Action:** When using non-interactive elements as buttons, always ensure keyboard accessibility by adding `role="button"`, `tabIndex={0}`, an `aria-label`, and an `onKeyDown` listener that triggers the action on the `Enter` and `Space` keys (calling `e.preventDefault()` on `Space` to prevent scrolling).
