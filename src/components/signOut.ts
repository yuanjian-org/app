import { getSession, signOut as nextAuthSignOut } from "next-auth/react";

export async function signOut(options?: { callbackUrl?: string }) {
  const session = await getSession();
  let callbackUrl = options?.callbackUrl ?? "/";
  if (session?.federatedLogoutUrl) {
    const target = new URL(callbackUrl, window.location.origin).toString();
    callbackUrl = `${session.federatedLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(target)}`;
  }
  return nextAuthSignOut({ callbackUrl });
}
