/**
 * This module generates security verification tokens.
 */
import randomNumber from "random-number-csprng";

/**
 * These tokens are weaker than long-lived tokens. Apply short expiration.
 */
export async function generateShortLivedToken() {
  return (await randomNumber(100000, 999999)).toString();
}

export const longLivedTokenLength = 9;

/**
 * Stronger tokens are more secure but harder to remember and type.
 */
export async function generateLongLivedToken() {
  const a = "a".charCodeAt(0);
  const chars = [];
  for (let i = 0; i < longLivedTokenLength; i++) {
    chars.push(String.fromCharCode(a + (await randomNumber(0, 25))));
  }
  return chars.join("").toUpperCase();
}
