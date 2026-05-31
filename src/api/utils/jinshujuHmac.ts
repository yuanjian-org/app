import { hmacChecksum } from "../../shared/strings";

export function calculateMediaHmac(
  userId: string,
  url: string | undefined,
): string {
  // It is important to include the user id in the HMAC calculation.
  // This prevents an attacker from easily reconstructing a valid HMAC
  // for an arbitrary URL independent of the targeted user, thereby
  // ensuring the token is intrinsically tied to a specific user.
  return hmacChecksum([userId, url]);
}
