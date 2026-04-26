import { NextApiRequest, NextApiResponse } from "next";
import type { JWTPayload } from "jose";
import db from "../../../api/database/db";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import {
  decryptPayload,
  hashUserIdForClient,
  logError,
  getOAuth2ClientConfig,
} from "../../../api/oauth2/utils";

export default async function userinfoHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    logError(`Method ${req.method} Not Allowed`);
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1. Verify the access token.
  const authHeader = req.headers.authorization;
  const bearerPrefix = "Bearer ";
  if (!authHeader || !authHeader.startsWith(bearerPrefix)) {
    logError("Missing or invalid Authorization header");
    return res.status(401).json({
      error: "invalid_request",
      error_description: "Missing or invalid Authorization header",
    });
  }

  const accessToken = authHeader.substring(bearerPrefix.length);

  let payload: JWTPayload;
  try {
    payload = await decryptPayload(accessToken);
  } catch (e) {
    logError("Invalid or expired token", e);
    return res.status(401).json({
      error: "invalid_token",
      error_description: "Invalid or expired token",
    });
  }

  // Prevent JWT Type Confusion. Only tokens explicitly marked as 'access' are
  // valid here.
  // This ensures an attacker cannot use an authorization 'code' (stolen via
  // open redirect) as an access token.
  if (payload.type !== "access") {
    logError("Invalid token type, expected access token", payload.type);
    return res.status(401).json({
      error: "invalid_token",
      error_description: "Invalid token type, expected access token",
    });
  }

  const clientConfig = getOAuth2ClientConfig(payload.clientId as string);
  if (!clientConfig) {
    logError("Invalid client_id in token", payload.clientId);
    return res
      .status(401)
      .json({ error: "invalid_token", error_description: "Invalid client_id" });
  }

  // 2. Fetch the user profile.
  const user = await db.User.findByPk(payload.userId as string, {
    attributes: userAttributes,
    include: userInclude,
  });

  if (!user) {
    logError("User not found", payload.userId);
    return res.status(404).json({ error: "user_not_found" });
  }

  const hashedUserId = hashUserIdForClient(payload.clientId as string, user.id);

  // 3. Return the standard OIDC userinfo response.
  return res.status(200).json({
    sub: hashedUserId,
    name: user.name,
    email: user.email,
    phone_number: user.phone,
  });
}
