import { getSession, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Custom wrapper for NextAuth's signOut method to support federated logout.
 *
 * When users log out locally, we also need to log them out of the SSO Identity
 * Provider (IdP) if they signed in using one. This function retrieves the
 * `federatedLogoutUrl` from the active session, attaches a `post_logout_redirect_uri`
 * pointing back to the current application, and redirects the browser to the IdP
 * to clear the SSO session as well.
 */
export async function signOut(options?: { callbackUrl?: string }) {
  const session = await getSession();
  let callbackUrl = options?.callbackUrl ?? "/";
  if (session?.federatedLogoutUrl) {
    // Construct the absolute URL of the callback to be sent to the IdP.
    const target = new URL(callbackUrl, window.location.origin).toString();
    callbackUrl = `${session.federatedLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(target)}`;
  }
  // nextAuthSignOut automatically clears local cookies and then redirects to callbackUrl.
  return nextAuthSignOut({ callbackUrl });
}
