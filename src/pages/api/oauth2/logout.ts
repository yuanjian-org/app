import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";
import { sanitizeCallbackUrl } from "../../../shared/callbackUrl";
import {
  logError,
  getOAuth2ClientConfig,
  ensureAllowedMethods,
} from "../../../api/oauth2/utils";

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

  // Validate the post_logout_redirect_uri against the configured OAUTH2_REDIRECT_URIS.
  // We allow redirects to the same origin as the client application.
  if (
    post_logout_redirect_uri &&
    clientConfig.configured &&
    clientConfig.validClient
  ) {
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

  // Sanitize callback URL to prevent open redirect or header injection risks.
  if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
    if (
      callbackUrl.includes("\\") ||
      /%5c/i.test(callbackUrl) ||
      /[\s\0-\x1f\x7f]/.test(callbackUrl)
    ) {
      callbackUrl = "/";
    }
  } else {
    callbackUrl = sanitizeCallbackUrl(callbackUrl);
  }

  return res.redirect(302, callbackUrl);
}
