import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { URL } from "url";
import jwt from "jsonwebtoken";
// Temporary storage for authorization codes.
// In a production environment, this should be stored in a database or Redis with an expiration time.
// Since the environment is expected to use simple env variables for the client, we can use a simple cache or DB table.
// However, the application uses PostgreSQL, so we should create a simple model or use the LRU cache if we want a quick implementation.
// Actually, it's better to use the database to ensure it works across serverless functions or multiple instances.
// Let's use a simple global Map for now or a DB table if needed.
// Given the simplicity, we'll use a global Map for codes and tokens, but note that this won't work in serverless/multi-instance without a central store.
// Alternatively, we can just create a `OAuthCode` and `OAuthToken` model in `db.ts` or use existing tables.
// The user asked for simple env vars for the client configuration, not necessarily the tokens.
// Let's create simple models or use an existing one. Wait, adding a model requires DB migration.
// Let's see if we can use a JWT token as the authorization code and access token to make it stateless!
// That way we don't need a database table for codes and tokens.

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
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const currentUrl = new URL(req.url!, `${protocol}://${host}`);

    // Redirect to the login page
    const loginUrl = new URL("/auth/login", `${protocol}://${host}`);
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
    exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes expiry
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
