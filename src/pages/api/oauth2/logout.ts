import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";
import {
  logError,
  getOAuth2ClientConfig,
  ensureAllowedMethods,
  getStringParam,
} from "../../../api/oauth2/utils";

export default function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!ensureAllowedMethods(req, res, ["GET", "POST"])) {
    return;
  }

  const post_logout_redirect_uri = getStringParam(
    req.query.post_logout_redirect_uri,
    "post_logout_redirect_uri",
  );
  const client_id = getStringParam(req.query.client_id, "client_id");

  let callbackUrl = "/";

  const clientConfig = getOAuth2ClientConfig(client_id);

  // Validate the post_logout_redirect_uri against the configured OAUTH2_REDIRECT_URIS.
  // We allow redirects to the same origin as the client application.
  if (
    post_logout_redirect_uri &&
    clientConfig.configured &&
    clientConfig.validClient
  ) {
    try {
      const allowedOrigin = new URL(clientConfig.redirectUri).origin;
      const requestedUrl = new URL(post_logout_redirect_uri);

      // Validate origin matches allowed client redirect origin and contains no
      // backslashes or control characters to prevent Open Redirect bypasses.
      const isUnsafeUrl =
        post_logout_redirect_uri.includes("\\") ||
        /%5c/i.test(post_logout_redirect_uri) ||
        /[\s\0-\x1f\x7f]/.test(post_logout_redirect_uri);

      if (allowedOrigin === requestedUrl.origin && !isUnsafeUrl) {
        callbackUrl = post_logout_redirect_uri;
      } else {
        logError(
          "post_logout_redirect_uri origin invalid or contains unsafe characters",
          requestedUrl.origin,
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
