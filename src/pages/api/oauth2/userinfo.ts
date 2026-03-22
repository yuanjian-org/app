import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import db from "../../../api/database/db";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";

export default async function userinfoHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1. Verify the access token.
  const authHeader = req.headers.authorization;
  const bearerPrefix = "Bearer ";
  if (!authHeader || !authHeader.startsWith(bearerPrefix)) {
    return res.status(401).json({
      error: "invalid_request",
      error_description: "Missing or invalid Authorization header",
    });
  }

  const accessToken = authHeader.substring(bearerPrefix.length);

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(accessToken, process.env.NEXTAUTH_SECRET!, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
  } catch {
    return res.status(401).json({
      error: "invalid_token",
      error_description: "Invalid or expired token",
    });
  }

  const expectedClientId = process.env.OAUTH2_CLIENT_ID;
  if (payload.clientId !== expectedClientId) {
    return res
      .status(401)
      .json({ error: "invalid_token", error_description: "Invalid client_id" });
  }

  // 2. Fetch the user profile.
  const user = await db.User.findByPk(payload.userId, {
    attributes: userAttributes,
    include: userInclude,
  });

  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }

  // 3. Return the standard OIDC userinfo response.
  return res.status(200).json({
    sub: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone,
  });
}
