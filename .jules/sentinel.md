## 2025-02-13 - Mitigated reverse tabnabbing in GroupBar
**Vulnerability:** Reverse tabnabbing via `window.open`
**Learning:** Using `window.open(url, "_blank")` without restricting the new window's access to the opening window exposes the user to a reverse tabnabbing attack where the new window can navigate the original tab to a malicious URL using `window.opener.location`. We could not simply pass `"noopener"` as an argument because the code needs to check `w.closed` as a fallback.
**Prevention:** Always nullify `w.opener` explicitly when a reference to the new window is needed, by using `if (w) w.opener = null;`. Alternatively, use Chakra UI's `<Link isExternal>` when programmatic navigation is not strictly necessary.
