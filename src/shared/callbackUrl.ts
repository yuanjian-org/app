export const loginCallbackUrlKey = "callbackUrl";
export const profileCallbackUrlKey = "profileCallbackUrl";

export function getSafeCallbackUrl(url: string | null | undefined): string {
  if (!url) return "/";
  // Protect against open redirect and javascript: XSS
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }
  return "/";
}
