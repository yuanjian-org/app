import z from "zod";
import { WhiteLabel } from "./WhiteLabel";

/**
 * Prefix the user's url in the x field to make it easier to identify the user
 * when examining raw data on Jinshuju's website.
 */
export function encodeXField(
  whiteLabel: WhiteLabel,
  userUrl: string | null | undefined,
  target: UploadTarget | null,
  userId: string,
  hmac: string,
) {
  return (
    whiteLabel +
    "," +
    (userUrl ? userUrl : "") +
    "," +
    (target ? target : "") +
    "," +
    userId +
    "," +
    hmac
  );
}

/**
 * @returns undefined if the x_field_1 is empty or malformed
 */
export function validateAndDecodeXField(
  whiteLabel: WhiteLabel,
  formEntry: Record<string, any>,
):
  | {
      userUrl: string;
      target: UploadTarget | undefined;
      userId: string;
      hmac: string;
    }
  | undefined {
  const xField = formEntry.x_field_1;
  if (!xField) return undefined;

  const parts = xField.split(",");
  if (parts.length < 5) return undefined;

  if (parts[0] !== whiteLabel) {
    throw new Error(`Invalid tenant name in x_field_1: ${parts[0]}`);
  }

  const userUrl = parts[1];
  const targetRaw = parts[2];
  const userId = parts[3];
  const hmac = parts.slice(4).join(",");

  let target: UploadTarget | undefined = undefined;
  if (targetRaw) {
    const parsedTarget = zUploadTarget.safeParse(targetRaw);
    if (parsedTarget.success) {
      target = parsedTarget.data;
    }
  }

  return { userUrl, target, userId, hmac };
}

export const zUploadTarget = z.enum(["UserProfilePicture", "UserProfileVideo"]);
export type UploadTarget = z.infer<typeof zUploadTarget>;
