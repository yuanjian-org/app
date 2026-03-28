/**
 * Generate a unique 6-character anonymous ID for a user.
 *
 * Format: YY-NNN
 * - YY: Last 2 digits of acceptance year (录取届)
 * - NNN: 3-digit hash derived from userId (000-999)
 *
 * @param userId - The user's UUID
 * @param acceptanceYear - The acceptance year (e.g., "2024")
 * @returns A 6-character string (e.g., "24-437")
 */
export function getAnonymousId(
  userId: string,
  acceptanceYear: string | null,
): string {
  // First 2 digits: last 2 digits of acceptance year.
  // Default to "00" if no acceptance year.
  const yearSuffix = acceptanceYear ? acceptanceYear.slice(-2) : "00";
  
  // Last 3 digits: deterministic hash of userId
  // Use a simple hash: sum of character codes mod 1000
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  }

  // Ensure it's always 3 digits with leading zeros if needed
  const userSuffix = hash.toString().padStart(3, "0");

  return yearSuffix + "-" + userSuffix;
}
