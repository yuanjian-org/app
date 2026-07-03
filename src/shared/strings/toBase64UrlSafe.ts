export function toBase64UrlSafe(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-") // Replace + with -
    .replace(/\//g, "_") // Replace / with _
    .replace(/=+$/, ""); // Remove padding
}
