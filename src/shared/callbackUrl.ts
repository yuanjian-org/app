export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

/**
 * Validate that a URL is a safe relative path starting with '/' to prevent
 * Open Redirect and XSS (via javascript:).
 *
 * It explicitly rejects protocol-relative paths starting with '//' or '/\'.
 */
export function getSafeCallbackUrl(url: string | null | undefined): string {
  if (!url) return "/";

  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }

  return "/";
}
