import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { LRUCache } from "lru-cache";
import { OAUTH2_AUTHORIZATION_CODE_EXPIRY_SECONDS } from "./authorize";

// Simple in-memory cache to prevent authorization code reuse.
// It stores the code string as the key and a boolean as the value.
// Entries expire after OAUTH2_AUTHORIZATION_CODE_EXPIRY_SECONDS.
const usedCodesCache = new LRUCache<string, boolean>({
  max: 10000,
  ttl: OAUTH2_AUTHORIZATION_CODE_EXPIRY_SECONDS * 1000,
});

export default function tokenHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
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
    const [id, secret] = decodedStr.split(":");
    clientId = id;
    clientSecret = secret;
  }

  const expectedClientId = process.env.OAUTH2_CLIENT_ID;
  const expectedClientSecret = process.env.OAUTH2_CLIENT_SECRET;

  if (!expectedClientId || !expectedClientSecret) {
    return res.status(500).json({ error: "OAuth2 Provider not configured." });
  }

  if (clientId !== expectedClientId || clientSecret !== expectedClientSecret) {
    return res.status(401).json({
      error: "invalid_client",
      error_description: "Invalid client_id or client_secret",
    });
  }

  if (grant_type !== "authorization_code") {
    return res.status(400).json({
      error: "unsupported_grant_type",
      error_description: "Only 'authorization_code' is supported",
    });
  }

  if (!code) {
    return res
      .status(400)
      .json({ error: "invalid_request", error_description: "Missing code" });
  }

  if (usedCodesCache.has(code)) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code already used",
    });
  }

  // 2. Decode and verify the authorization code.
  let payload: any;
  try {
    payload = jwt.verify(code, process.env.NEXTAUTH_SECRET!, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid or expired authorization code",
    });
  }

  if (payload.clientId !== clientId) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Code issued for a different client",
    });
  }

  if (
    payload.redirectUri !== redirect_uri &&
    payload.redirectUri !== undefined
  ) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Mismatching redirect_uri",
    });
  }

  // PKCE verification if present
  if (payload.codeChallenge) {
    if (!code_verifier) {
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
      return res.status(400).json({
        error: "invalid_grant",
        error_description: "Invalid code_verifier",
      });
    }
  }

  // Mark the code as used in the cache
  usedCodesCache.set(code, true);

  // 3. Issue the access token and id_token.
  // We encode the user ID into the access token. It's valid for 1 hour.
  const accessTokenPayload = {
    userId: payload.userId,
    clientId: clientId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.NEXTAUTH_SECRET!,
    {
      algorithm: "HS256",
    },
  );

  // We could also issue an id_token (OIDC) which is a standard JWT.
  // For simplicity and since we don't have a private/public key pair, we'll use HMAC (HS256) for the id_token as well, using NEXTAUTH_SECRET.
  // Need the actual server URL for the issuer
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  const issuer = `${protocol}://${host}`;

  const idTokenPayload = {
    iss: issuer,
    sub: payload.userId,
    aud: clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  const idToken = jwt.sign(idTokenPayload, expectedClientSecret, {
    algorithm: "HS256",
  });

  return res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: idToken,
    scope: "openid profile email",
  });
}
