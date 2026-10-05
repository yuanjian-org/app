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

  // Validate post_logout_redirect_uri against OAUTH2_REDIRECT_URIS
  // or validate as safe local path using sanitizeCallbackUrl.
  if (post_logout_redirect_uri) {
    if (clientConfig.configured && clientConfig.validClient) {
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
        // Fallback to checking for a safe local relative redirect path
        callbackUrl = sanitizeCallbackUrl(post_logout_redirect_uri);
      }
    } else {
      logError(
        "Invalid client_id or client OAuth2 configuration not found",
        client_id,
      );
      callbackUrl = sanitizeCallbackUrl(post_logout_redirect_uri);
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
