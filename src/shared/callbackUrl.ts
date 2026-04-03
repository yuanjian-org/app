export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

/**
 * Ensure that the callback URL is a safe local path to prevent Open Redirect
 * and XSS (via javascript:) vulnerabilities.
 *
 * It must start with a single "/" and not be followed by another "/" or "\".
 */
export function getSafeCallbackUrl(url: string | undefined): string {
  if (!url) return "/";

  // Check if it's a relative path starting with /
  // and not a protocol-relative path starting with // or /\
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }

  return "/";
}
