## 2024-12-04 - Adding Tooltip to clickable HStack for UX enhancement
**Learning:** Adding `Tooltip` to visually un-labeled functional elements (like a generic click-to-copy HStack showing an icon) makes the action much clearer to users. In Chakra UI, elements like `HStack` can directly accept an `onClick` handler and be wrapped by `Tooltip` securely.
**Action:** Always wrap interactive icon-only or ambiguous clickable UI blocks with a helpful Chakra `Tooltip` to clarify their action.
