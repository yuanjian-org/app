## 2025-06-18 - Adding Tooltips to Icon Buttons
**Learning:** Chakra UI `IconButton`s often use `aria-label` for screen readers but lack hover tooltips for sighted users. Adding `<Tooltip>` wrappers improves discoverability. It is important to match the application's locale language when adding tooltip strings, even if the surrounding code comments/visible texts have mixed locales.
**Action:** When adding UX tooltips to Chakra UI, ensure the text language matches the primary audience or the closest surrounding aria-label logic.
