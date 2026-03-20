export function getAnonymousId(
  userId: string,
  acceptanceYear: string | null,
): string {
  // First 2 digits: last 2 digits of acceptance year
  const yearSuffix = acceptanceYear ? acceptanceYear.slice(-2) : "00"; // Default to "00" if no acceptance year

  // Last 3 digits: deterministic hash of userId
  // Use a simple hash: sum of character codes mod 1000
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  }

  // Ensure it is always 3 digits with leading zeros if needed
  const userSuffix = hash.toString().padStart(3, "0");

  return yearSuffix + "-" + userSuffix;
}
