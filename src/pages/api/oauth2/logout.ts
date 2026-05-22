import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";
import * as jose from "jose";
import { logError, getOAuth2ClientConfig } from "../../../api/oauth2/utils";

export default function logoutHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    logError(`Method ${req.method} Not Allowed`);
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { post_logout_redirect_uri, client_id, id_token_hint } = req.query as {
    post_logout_redirect_uri?: string;
    client_id?: string;
    id_token_hint?: string;
  };

  let callbackUrl = "/";

  let extractedClientId: string | undefined = client_id;

  if (!extractedClientId && id_token_hint) {
    try {
      const decoded = jose.decodeJwt(id_token_hint);
      if (typeof decoded.aud === "string") {
        extractedClientId = decoded.aud;
      } else if (Array.isArray(decoded.aud) && decoded.aud.length > 0) {
        extractedClientId = decoded.aud[0];
      }
    } catch (e) {
      logError("Invalid id_token_hint", e);
    }
  }

  const clientConfig = getOAuth2ClientConfig(extractedClientId);

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

  return res.redirect(302, callbackUrl);
}
