import { fromBase64UrlSafe, toBase64UrlSafe } from "./strings";

export type UploadTarget = "UserProfilePicture";

/**
 * @param id uniquely identifies the upload
 * @param opaque a security token against unauthorized uploads
 */
export function encodeUploadTokenUrlSafe(
  target: UploadTarget,
  id: string,
  opaque: string
) {
  return toBase64UrlSafe(JSON.stringify({ target, id, opaque }));
}

export function decodeUploadTokenUrlSafe(encoded: string) {
  const { target, id, opaque } = JSON.parse(fromBase64UrlSafe(encoded));
  return { target, id, opaque };
}
