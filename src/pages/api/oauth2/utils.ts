import crypto from "crypto";
import * as jose from "jose";

/**
 * Hashes the combination of the client ID and the local user ID.
 * This provides a unique ID per client for the same user,
 * and prevents clients from guessing user IDs in other clients.
 */
export function hashUserIdForClient(clientId: string, userId: string): string {
  return crypto
    .createHash("sha256")
    .update(clientId + userId)
    .digest("hex");
}

/**
 * Returns a 32-byte secret key derived from NEXTAUTH_SECRET.
 * This ensures the key length is correct for A256GCM.
 */
function getEncryptionKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  // Use SHA-256 to ensure exactly 32 bytes (256 bits) for A256GCM
  const hash = crypto.createHash("sha256").update(secret).digest();
  return new Uint8Array(hash);
}

/**
 * Encrypts a payload into a JWE string.
 * This hides the contents of the payload (like the plain userId) from the client.
 */
export async function encryptPayload(
  payload: jose.JWTPayload,
): Promise<string> {
  const secretKey = getEncryptionKey();
  // Using direct encryption (alg: "dir") with A256GCM since we have a shared
  // symmetric secret
  // and do not need to wrap/encrypt the key itself. A256GCM provides
  // authenticated encryption.
  const jwt = await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(secretKey);
  return jwt;
}

/**
 * Decrypts a JWE string and verifies its payload.
 */
export async function decryptPayload(token: string): Promise<jose.JWTPayload> {
  const secretKey = getEncryptionKey();
  const { payload } = await jose.jwtDecrypt(token, secretKey);
  return payload;
}
