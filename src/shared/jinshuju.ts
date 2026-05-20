import { fromBase64UrlSafe, toBase64UrlSafe } from "./strings";
import { MinUser } from "./User";

/**
 * Gets the tenant name for the current environment.
 * For frontend code, use `useStaticGlobalConfigs()` from `src/components/useStaticGlobalConfigs.ts`
 * to get the `whiteLabel` and pass it to this function.
 * For backend code, it relies on `process.env.WHITE_LABEL`.
 */
function getTenantName(whiteLabel?: string): string {
  return whiteLabel || process.env.WHITE_LABEL || "yuantu";
}

/**
 * Prefix the user's url in the x field to make it easier to identify the user
 * when examining raw data on Jinshuju's website.
 *
 * @param urlSafeValue must be a URL-safe string
 */
export function encodeXField(
  user: MinUser,
  urlSafeValue: string,
  whiteLabel?: string,
) {
  const tenant = getTenantName(whiteLabel);
  return tenant + "," + (user.url ? user.url : "") + "," + urlSafeValue;
}

/**
 * @returns undefined if the x_field_1 is empty or malformed
 */
export function validateAndDecodeXField(
  formEntry: Record<string, any>,
): string | undefined {
  const xField = formEntry.x_field_1;
  if (!xField) return undefined;

  const parts = xField.split(",");
  if (parts.length < 2) return undefined;

  const expectedTenant = getTenantName();
  if (parts[0] !== expectedTenant) {
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
