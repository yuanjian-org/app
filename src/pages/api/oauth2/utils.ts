import crypto from "crypto";

/**
 * Generates a pairwise user identifier by taking the SHA-256 hash of the
 * concatenated `clientId` and `userId`. This ensures that:
 * 1) Each client receives a different, unique ID for the same user.
 * 2) Clients cannot guess or correlate user IDs across different applications.
 */
export function getPairwiseUserId(clientId: string, userId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${clientId}${userId}`)
    .digest("hex");
}
