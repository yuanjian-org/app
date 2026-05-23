import { fromBase64UrlSafe, toBase64UrlSafe } from "./strings";
import { MinUser } from "./User";
import { WhiteLabel } from "./WhiteLabel";

/**
 * Prefix the user's url in the x field to make it easier to identify the user
 * when examining raw data on Jinshuju's website.
 *
 * @param urlSafeValue must be a URL-safe string
 */
export function encodeXField(
  whiteLabel: WhiteLabel,
  user: MinUser,
  urlSafeValue: string,
) {
  return whiteLabel + "," + (user.url ? user.url : "") + "," + urlSafeValue;
}

/**
 * @returns undefined if the x_field_1 is empty or malformed
 */
export function validateAndDecodeXField(
  whiteLabel: WhiteLabel,
  formEntry: Record<string, any>,
): string | undefined {
  const xField = formEntry.x_field_1;
  if (!xField) return undefined;

  const parts = xField.split(",");
  if (parts.length < 2) return undefined;

  if (parts[0] !== whiteLabel) {
    throw new Error(`Invalid tenant name in x_field_1: ${parts[0]}`);
  }

  return parts.slice(2).join(",");
}

export type UploadTarget = "UserProfilePicture" | "UserProfileVideo";

/**
 * @param id uniquely identifies the upload
 * @param opaque a security token against unauthorized uploads
 */
export function encodeUploadTokenUrlSafe(
  target: UploadTarget,
  id: string,
  opaque: string,
) {
  return toBase64UrlSafe(JSON.stringify({ target, id, opaque }));
}

export function decodeUploadTokenUrlSafe(encoded: string) {
  const { target, id, opaque } = JSON.parse(fromBase64UrlSafe(encoded));
  return { target, id, opaque };
}
