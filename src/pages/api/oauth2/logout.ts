import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";
import {
  logError,
  getOAuth2ClientConfig,
  ensureAllowedMethods,
} from "../../../api/oauth2/utils";
import { sanitizeCallbackUrl } from "../../../shared/callbackUrl";

export default function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureAllowedMethods(req, res, ["GET", "POST"])) {
    return;
  }

  const { post_logout_redirect_uri, client_id } = req.query as {
    post_logout_redirect_uri?: string;
    client_id?: string;
  };

  let callbackUrl = "/";

  const clientConfig = getOAuth2ClientConfig(client_id);

  // Validate post_logout_redirect_uri.
  // Support safe relative paths, or absolute URLs matching configured origin.
  if (post_logout_redirect_uri) {
    if (post_logout_redirect_uri.startsWith("/")) {
      // Use sanitizeCallbackUrl to prevent protocol-relative open redirects
      callbackUrl = sanitizeCallbackUrl(post_logout_redirect_uri);
    } else if (clientConfig.configured && clientConfig.validClient) {
      try {
        const allowedOrigin = new URL(clientConfig.redirectUri).origin;
        const requestedOrigin = new URL(post_logout_redirect_uri).origin;

        if (allowedOrigin === requestedOrigin) {
          callbackUrl = post_logout_redirect_uri;
        } else {
          logError(
            "post_logout_redirect_uri origin does not match allowed origin",
            requestedOrigin,
          );
        }
      } catch (e) {
        logError(
          "Invalid post_logout_redirect_uri URL",
          post_logout_redirect_uri,
          e,
        );
        // Ignore invalid URLs and fallback to "/"
      }
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
