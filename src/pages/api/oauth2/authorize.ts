import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { URL } from "url";
import jwt from "jsonwebtoken";
import getBaseUrl from "../../../shared/getBaseUrl";

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
    code_challenge,
    code_challenge_method,
  } = req.query as {
    response_type?: string;
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };

  // 1. Validate the client ID and redirect URI against the env variables.
  const expectedClientId = process.env.OAUTH2_CLIENT_ID;
  const expectedRedirectUri = process.env.OAUTH2_REDIRECT_URI;

  if (!expectedClientId) {
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

  // Allow empty redirect_uri if OAUTH2_REDIRECT_URI is set, or enforce matching
  if (
    expectedRedirectUri &&
    redirect_uri &&
    redirect_uri !== expectedRedirectUri
  ) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Invalid redirect_uri",
    });
  }
  const finalRedirectUri = redirect_uri || expectedRedirectUri;

  if (!finalRedirectUri) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing redirect_uri",
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

  // 3. The user is logged in and authorized. Generate an authorization code.
  // We will encode the user ID and code_challenge into a JWT-like string or just sign it, so we don't need database state.
  // The secret for signing this code will be NEXTAUTH_SECRET.
  const codePayload = {
    userId: session.me.id,
    clientId: client_id,
    redirectUri: finalRedirectUri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    exp: Math.floor(Date.now() / 1000) + authCodeExpiryInSec,
  };

  // Create a JWT signed code
  const code = jwt.sign(codePayload, process.env.NEXTAUTH_SECRET!, {
    algorithm: "HS256",
  });

  // 4. Redirect back to the client's redirect_uri with the code and state.
  const redirectUrl = new URL(finalRedirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return res.redirect(302, redirectUrl.toString());
}
