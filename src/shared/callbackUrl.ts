export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

/**
 * Checks if a URL is a safe local path for redirection.
 * A path is considered safe if it starts with a single '/' and is not followed
 * by another '/' or '\', which could be used for protocol-relative redirects.
 * It also implicitly prevents 'javascript:' URLs as they don't start with '/'.
 */
export function isSafeCallbackUrl(url: string | null | undefined): boolean {
  if (
    !url ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\")
  ) {
    return false;
  }
  return true;
}

/**
 * Returns a safe local path for redirection, falling back to '/' if invalid.
 */
export function sanitizeCallbackUrl(url: string | null | undefined): string {
  return isSafeCallbackUrl(url) ? url! : "/";
}
