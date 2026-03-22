import { NextApiRequest, NextApiResponse } from "next";
import getBaseUrl from "../../../shared/getBaseUrl";

export default function openidConfigurationHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const baseUrl = getBaseUrl();

  return res.status(200).json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth2/authorize`,
    token_endpoint: `${baseUrl}/api/oauth2/token`,
    userinfo_endpoint: `${baseUrl}/api/oauth2/userinfo`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"], // We are using HMAC SHA-256 with NEXTAUTH_SECRET.
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "name",
      "email",
      "picture",
      "phone_number",
      "roles",
    ],
    grant_types_supported: ["authorization_code"],
  });
}
