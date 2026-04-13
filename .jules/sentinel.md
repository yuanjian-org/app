## 2024-05-18 - Tabnabbing Vulnerability
**Vulnerability:** window.open without noopener noreferrer
**Learning:** window.open can lead to tabnabbing where new page can control window.opener and execute XSS attacks on original domain.
**Prevention:** Add 'noopener,noreferrer' to third argument in window.open(url, target, features).
