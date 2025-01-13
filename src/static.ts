/**
 * Utilities for static (i.e. non-app) pages
 */

export const staticUrlPrefix = "/s";

/**
 * Usage:
 *  const router = useRouter();
 *  if (isStaticPage(router.route)) { ... }
 */
export function isStaticPage(route: string): boolean {
  return route === staticUrlPrefix || route.startsWith(`${staticUrlPrefix}/`);
}
