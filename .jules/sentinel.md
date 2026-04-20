## 2024-05-24 - Reverse Tabnabbing Vulnerability
**Vulnerability:** Found `window.open(link, "_blank")` being used without unsetting the opener reference.
**Learning:** Even though we are redirecting to an internal tRPC meeting URL, a malicious redirect URL returned or other link could exploit `window.opener` to navigate the original tab away.
**Prevention:** Always unset `w.opener = null` when calling `window.open(link, "_blank")` to prevent reverse tabnabbing attacks.
