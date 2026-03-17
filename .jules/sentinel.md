# Sentinel Journal

## 2026-03-17 - [Added XSS protection for MarkdownStyler]
**Vulnerability:** The `MarkdownStyler` component had an `allowHtml` prop that enabled `rehype-raw` to parse raw HTML from markdown content. This was used for static articles, but could lead to XSS if used with untrusted content.
**Learning:** Although currently only used for static articles from the filesystem, the component was designed with a "DANGEROUS" warning but no actual sanitization. Adding `rehype-sanitize` ensures that even when HTML is allowed, it's restricted to a safe subset.
**Prevention:** Always use a sanitizer when parsing raw HTML in components that render user-generated or semi-trusted content.
