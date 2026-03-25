import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { URL } from "url";
import crypto from "crypto";
import getBaseUrl from "../../../shared/getBaseUrl";
import { encryptPayload } from "./utils";

export const authCodeExpiryInSec = 10 * 60; // 10 minutes

// We use stateless JWT tokens as the authorization code and access token to simplify deployment.
// This avoids needing a separate database table for codes and tokens. Single-use enforcement
// for codes is handled via an LRU cache in the token exchange endpoint.

export default async function authorizeHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // The client will redirect the user to this endpoint.
  // We need to verify the user is logged in.
  const session = await getServerSession(req, res, authOptions(req));

  const {
    response_type,
    client_id,
    redirect_uri,
    state,
    nonce,
    code_challenge,
    code_challenge_method,
  } = req.query as {
    response_type?: string;
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    nonce?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };

  // 1. Validate the client ID and redirect URI against the env variables.
  const expectedClientId = process.env.OAUTH2_CLIENT_ID;
  const expectedRedirectUri = process.env.OAUTH2_REDIRECT_URI;

  // Provider must be fully configured.
  if (!expectedClientId || !expectedRedirectUri) {
    return res.status(500).json({ error: "OAuth2 Provider not configured." });
  }

  if (!client_id || client_id !== expectedClientId) {
    return res.status(400).json({
      error: "invalid_client",
      error_description: "Invalid client_id",
    });
  }

  if (response_type !== "code") {
    return res.status(400).json({
      error: "unsupported_response_type",
      error_description: "Only 'code' response_type is supported",
    });
  }

  // Client MUST provide a redirect_uri and it MUST exactly match the configured URI.
  // This prevents Open Redirect vulnerabilities where an attacker could steal authorization codes.
  if (!redirect_uri || redirect_uri !== expectedRedirectUri) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing or invalid redirect_uri",
    });
  }

  // If a PKCE code challenge is provided, the method MUST be S256.
  // 'plain' is inherently insecure and should not be used in modern OAuth2 implementations.
  if (code_challenge && code_challenge_method !== "S256") {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "PKCE code_challenge_method must be S256",
    });
  }

  // 2. If the user is not logged in, redirect them to the login page with a callbackUrl pointing back to this endpoint.
  if (!session?.me) {
    // Construct the URL to return to this authorization endpoint after login
    const baseUrl = getBaseUrl();
    const currentUrl = new URL(req.url!, baseUrl);

    // Redirect to the login page
    const loginUrl = new URL("/auth/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", currentUrl.toString());

    return res.redirect(302, loginUrl.toString());
  }

  // 3. If the user is logged in but hasn't set their phone number, redirect them
  // to a profile setup page before proceeding.
  if (!session.me.phone) {
    const baseUrl = getBaseUrl();
    const currentUrl = new URL(req.url!, baseUrl);

    // Redirect to the profile setup page, passing the current authorize URL as the callback
    const setupUrl = new URL("/auth/set-profile", baseUrl);
    setupUrl.searchParams.set("callbackUrl", currentUrl.toString());

    return res.redirect(302, setupUrl.toString());
  }

  // 4. The user is logged in and authorized. Generate an authorization code.
  // We will encrypt the user ID and code_challenge into a JWE string, so we don't need database state
  // and the client cannot read the plain userId.
  const codePayload = {
    // Add a distinct type to prevent an authorization code from being directly used as an access token (JWT Type Confusion).
    type: "code",
    // Add a unique identifier (JWT ID) to prevent collision of identical requests within the same second,
    // which would otherwise generate the exact same JWT signature and falsely fail single-use enforcement.
    jti: crypto.randomUUID(),
    userId: session.me.id,
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    // OIDC: Pass the nonce through to be included in the final id_token.
    nonce,
    exp: Math.floor(Date.now() / 1000) + authCodeExpiryInSec,
  };

  // Create an encrypted JWE string
  const code = await encryptPayload(codePayload);

  // 5. Redirect back to the client's redirect_uri with the code and state.
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return res.redirect(302, redirectUrl.toString());
}
