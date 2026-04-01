export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

/**
 * Returns a safe local path for redirection.
 * A path is considered safe if it starts with a single '/' and is not followed
 * by another '/' or '\', which could be used for protocol-relative redirects.
 * It also implicitly prevents 'javascript:' URLs as they don't start with '/'.
 */
export function getSafeCallbackUrl(url: string | null | undefined): string {
  if (
    !url ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\")
  ) {
    return "/";
  }
  return url;
}
