import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";

export default function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    console.error(`Method ${req.method} Not Allowed`);
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { post_logout_redirect_uri } = req.query as {
    post_logout_redirect_uri?: string;
  };

  const expectedRedirectUri = process.env.OAUTH2_REDIRECT_URI;
  let callbackUrl = "/";

  // Validate the post_logout_redirect_uri against the configured OAUTH2_REDIRECT_URI.
  // We allow redirects to the same origin as the client application.
  if (post_logout_redirect_uri && expectedRedirectUri) {
    try {
      const allowedOrigin = new URL(expectedRedirectUri).origin;
      const requestedOrigin = new URL(post_logout_redirect_uri).origin;

      if (allowedOrigin === requestedOrigin) {
        callbackUrl = post_logout_redirect_uri;
      } else {
        console.error(
          `Requested post_logout_redirect_uri origin ${requestedOrigin} does not match allowed origin ${allowedOrigin}`,
        );
      }
    } catch (error) {
      console.error(
        `Error parsing post_logout_redirect_uri or expectedRedirectUri:`,
        error,
      );
      // Ignore invalid URLs and fallback to "/"
    }
  }

  // Determine if we are using secure cookies.
  // In production, NEXTAUTH_URL is typically https://...
  const isSecure = getBaseUrl().startsWith("https://");

  const cookiePrefix = isSecure ? "__Secure-" : "";
  const hostPrefix = isSecure ? "__Host-" : "";

  // The JWT session strategy in next-auth relies on these cookies.
  // Destroying them effectively logs the user out from the provider.
  const cookiesToClear = [
    `${cookiePrefix}next-auth.session-token`,
    `${hostPrefix}next-auth.csrf-token`,
    `${cookiePrefix}next-auth.callback-url`,
  ];

  const cookieAttributes = `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  const serializedCookies = cookiesToClear.map(
    (name) => `${name}=; ${cookieAttributes}`,
  );

  res.setHeader("Set-Cookie", serializedCookies);

  return res.redirect(302, callbackUrl);
}
