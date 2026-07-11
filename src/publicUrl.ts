export const publicUrlPrefix = "/s";

/**
 * Usage:
 *  const router = useRouter();
 *  if (isPublicUrl(router.route)) { ... }
 */
export function isPublicUrl(url: string): boolean {
  return url === publicUrlPrefix || url.startsWith(`${publicUrlPrefix}/`);
}
