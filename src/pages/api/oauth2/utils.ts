import crypto from "crypto";

export function getPairwiseUserId(clientId: string, userId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${clientId}${userId}`)
    .digest("hex");
}
