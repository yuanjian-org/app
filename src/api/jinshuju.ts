import crypto from "crypto";
import { WhiteLabel } from "../shared/WhiteLabel";
import { generalBadRequestError } from "./errors";

function hmacChecksumUrlSafe(data: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  const base64 = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Prefix the user's url in the x field to make it easier to identify the user
 * when examining raw data on Jinshuju's website.
 */
export function encodeXField(
  whiteLabel: WhiteLabel,
  userUrl: string | undefined | null,
  userId: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const urlPart = userUrl ? userUrl : "";
  const data = `${whiteLabel},${urlPart},${userId},${timestamp}`;
  const hmac = hmacChecksumUrlSafe(data);
  return `${data},${hmac}`;
}

export function validateAndDecodeXField(
  whiteLabel: WhiteLabel,
  formEntry: Record<string, any>,
): string {
  const xField = formEntry.x_field_1;
  if (!xField || typeof xField !== "string") {
    throw generalBadRequestError(`Empty or malformed x_field_1`);
  }

  const parts = xField.split(",");
  if (parts.length !== 5) {
    throw generalBadRequestError(`Malformed x_field_1`);
  }

  const [wl, url, userId, timestampStr, hmac] = parts;

  if (wl !== whiteLabel) {
    throw generalBadRequestError(`Invalid tenant name in x_field_1: ${wl}`);
  }

  const data = `${wl},${url},${userId},${timestampStr}`;
  const expectedHmac = hmacChecksumUrlSafe(data);

  if (
    hmac.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
  ) {
    throw generalBadRequestError(`Invalid HMAC in x_field_1`);
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    throw generalBadRequestError(`Invalid timestamp in x_field_1`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (timestamp > now) {
    throw generalBadRequestError(`Timestamp in x_field_1 is in the future`);
  }

  if (now - timestamp > 30 * 60) {
    throw generalBadRequestError(`Timestamp in x_field_1 expired`);
  }

  return userId;
}
