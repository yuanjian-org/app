export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

/**
 * Returns a safe URL for redirection.
 * To prevent open redirect and `javascript:` protocol XSS vulnerabilities,
 * we only allow relative paths that start with `/` but not `//`.
 */
export function getSafeCallbackUrl(url: string | null | undefined): string {
  if (!url) return "/";
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return "/";
}
