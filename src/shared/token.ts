// TODO: Merge with IdToken.ts?
import randomNumber from "random-number-csprng";

/**
 * Tokens for various security verification purposes.
 */
export const tokenLength = 6;
export const tokenMaxAgeInMins = 5;
export const tokenMinSendIntervalInSeconds = 30;

export async function generateToken() {
  return (await randomNumber(100000, 999999)).toString();
}
