import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import * as jose from "jose";
import { LRUCache } from "lru-cache";
import { authCodeExpiryInSec } from "./authorize";
import {
  hashUserIdForClient,
  encryptPayload,
  decryptPayload,
  logError,
  getOAuth2ClientConfig,
} from "../../../api/oauth2/utils";
import getBaseUrl from "../../../shared/getBaseUrl";

// Simple in-memory cache to prevent authorization code reuse.
// It stores the code string as the key and a boolean as the value.
// Entries expire after authCodeExpiryInSec.
const usedCodesCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: authCodeExpiryInSec * 1000,
});

export default async function tokenHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    logError(`Method ${req.method} Not Allowed`);
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
  } = req.body;

  // 1. Verify client credentials. Can be passed in body or Basic Auth header.
  const authHeader = req.headers.authorization;
  let clientId = client_id;
  let clientSecret = client_secret;

  if (authHeader?.startsWith("Basic ")) {
    const encodedStr = authHeader.substring(6);
    const decodedStr = Buffer.from(encodedStr, "base64").toString("utf-8");
    // RFC 6749: only the first colon separates the client_id from the secret.
    // Using split(":") would silently truncate secrets that contain colons.
    const colonIndex = decodedStr.indexOf(":");
    clientId = decodedStr.substring(0, colonIndex);
    clientSecret = decodedStr.substring(colonIndex + 1);
  }

  const clientConfig = getOAuth2ClientConfig(clientId);

  if (!clientConfig) {
    logError("OAuth2 Provider not configured or invalid client_id");
    const hasIds = !!process.env.OAUTH2_CLIENT_IDS;
    if (!hasIds) {
      return res.status(500).json({ error: "OAuth2 Provider not configured." });
    }
    return res.status(401).json({
      error: "invalid_client",
      error_description: "Invalid client_id",
    });
  }

  const {
    clientId: expectedClientId,
    clientSecret: expectedClientSecret,
    redirectUri: expectedRedirectUri,
  } = clientConfig;

  // Use timing-safe comparison to prevent timing attacks that could be used
  // to guess the client secret character by character.
  const clientIdBuf = Buffer.from(clientId ?? "");
  const secretBuf = Buffer.from(clientSecret ?? "");
  const expectedIdBuf = Buffer.from(expectedClientId);
  const expectedSecretBuf = Buffer.from(expectedClientSecret);
  const validClientId =
    clientIdBuf.length === expectedIdBuf.length &&
    crypto.timingSafeEqual(clientIdBuf, expectedIdBuf);
  const validClientSecret =
    secretBuf.length === expectedSecretBuf.length &&
    crypto.timingSafeEqual(secretBuf, expectedSecretBuf);
  if (!validClientId || !validClientSecret) {
    logError(
      "Invalid client_id or client_secret",
      validClientId,
      validClientSecret,
    );
    return res.status(401).json({
      error: "invalid_client",
      error_description: "Invalid client_id or client_secret",
    });
  }

  // The redirect_uri provided in the token request must strictly match the
  // pre-configured URI,
  // just as it did in the authorization request. This mitigates Open Redirect
  // and token theft.
  if (redirect_uri !== expectedRedirectUri) {
    logError("Mismatching redirect_uri", redirect_uri, expectedRedirectUri);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Mismatching redirect_uri",
    });
  }

  if (grant_type !== "authorization_code") {
    logError("Only 'authorization_code' is supported", grant_type);
    return res.status(400).json({
      error: "unsupported_grant_type",
      error_description: "Only 'authorization_code' is supported",
    });
  }

  if (!code) {
    logError("Missing code");
    return res
      .status(400)
      .json({ error: "invalid_request", error_description: "Missing code" });
  }

  if (usedCodesCache.has(code)) {
    logError("Authorization code already used", code);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code already used",
    });
  }

  // 2. Decode and verify the authorization code.
  let payload: any;
  try {
    payload = await decryptPayload(code);
  } catch (e) {
    logError("Invalid or expired authorization code", e);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid or expired authorization code",
    });
  }

  // Prevent JWT Type Confusion. Only tokens explicitly marked as 'code' are
  // valid here.
  // This ensures an attacker cannot use an 'access' token generated for the API
  // as an authorization code.
  if (payload.type !== "code") {
    logError("Invalid token type, expected authorization code", payload.type);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid token type, expected authorization code",
    });
  }

  if (payload.clientId !== clientId) {
    logError("Code issued for a different client", payload.clientId, clientId);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Code issued for a different client",
    });
  }

  if (payload.redirectUri !== redirect_uri) {
    logError(
      "Mismatching redirect_uri in payload",
      payload.redirectUri,
      redirect_uri,
    );
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Mismatching redirect_uri",
    });
  }

  // PKCE verification if present
  if (payload.codeChallenge) {
    if (!code_verifier) {
      logError("Missing code_verifier for PKCE");
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing code_verifier for PKCE",
      });
    }
    const hash = crypto
      .createHash("sha256")
      .update(code_verifier)
      .digest("base64url");
    if (hash !== payload.codeChallenge) {
      logError("Invalid code_verifier", hash, payload.codeChallenge);
      return res.status(400).json({
        error: "invalid_grant",
        error_description: "Invalid code_verifier",
      });
    }
  }

  // Mark the code as used in the cache
  usedCodesCache.set(code, true);

  // 3. Issue the access token and id_token.
  // We encode the plain user ID into the access token, but we encrypt the
  // access token. It's valid for 1 hour.
  const accessTokenPayload = {
    // Add a distinct type to prevent an access token from being used as an
    // authorization code (JWT Type Confusion).
    type: "access",
    // Add a unique identifier (JWT ID) to ensure each generated access token is
    // distinct.
    jti: crypto.randomUUID(),
    userId: payload.userId,
    clientId: clientId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
  };

  const accessToken = await encryptPayload(accessTokenPayload);

  // We could also issue an id_token (OIDC) which is a standard JWT.
  // For simplicity and since we don't have a private/public key pair, we'll use
  // HMAC (HS256) for the id_token as well, using NEXTAUTH_SECRET.
  // Use the configured base URL for the issuer rather than trusting the
  // untrusted x-forwarded-proto / host request headers.
  const issuer = getBaseUrl();

  // Generate the hashed user ID for the client.
  const hashedUserId = hashUserIdForClient(clientId, payload.userId as string);

  const idTokenPayload: any = {
    // Add a distinct type for the OIDC token.
    type: "id",
    // Add a unique identifier (JWT ID) to ensure each generated id token is
    // distinct.
    jti: crypto.randomUUID(),
    iss: issuer,
    sub: hashedUserId,
    aud: clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  // OIDC: Include the nonce from the authorization request if one was provided
  // to mitigate replay attacks.
  if (payload.nonce) {
    idTokenPayload.nonce = payload.nonce;
  }

  // Create an HMAC SHA-256 signed ID Token using jose
  const secret = new TextEncoder().encode(expectedClientSecret);
  const idToken = await new jose.SignJWT(idTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);

  return res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: idToken,
    scope: "openid profile email",
  });
}
