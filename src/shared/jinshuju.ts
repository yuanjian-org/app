import { fromBase64UrlSafe, toBase64UrlSafe } from "./strings";
import { MinUser } from "./User";

/**
 * Prefix the user's url in the x field to make it easier to identify the user
 * when examining raw data on Jinshuju's website.
 *
 * @param urlSafeValue must be a URL-safe string
 */
export function encodeXField(user: MinUser, urlSafeValue: string) {
  return (user.url ? user.url : "") + "," + urlSafeValue;
}

/**
 * @returns undefined if the x_field_1 is empty or malformed
 */
export function decodeXField(
  formEntry: Record<string, any>,
): string | undefined {
  return formEntry.x_field_1?.split(",")[1];
}

export type UploadTarget = "UserProfilePicture";

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
