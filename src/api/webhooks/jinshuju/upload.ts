import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import { hmacChecksum } from "../../../shared/strings";
import {
  decodeUploadTokenUrlSafe,
  validateAndDecodeXField,
} from "../../../shared/jinshuju";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";

/**
 * The Webhook for 金数据 form ids Bz3uSO and nhFsf1.
 */
export default async function submit(entry: Record<string, any>) {
  const urls: string[] = entry.field_1;
  if (urls.length !== 1) {
    throw generalBadRequestError(`# urls isn't one: ${urls.length}`);
  }

  const token = validateAndDecodeXField(getWhiteLabel(), entry);
  if (!token) {
    throw generalBadRequestError(`Empty or malformed x_field_1`);
  }

  const { target, id, opaque } = decodeUploadTokenUrlSafe(token);
  console.log("Upload target:", target);
  console.log("Upload id:    ", id);
  console.log("Upload opaque:", opaque);

  if (!target || !id || !opaque) {
    throw generalBadRequestError(`Invalid target, id, or hmac`);
  }

  if (target === "UserProfilePicture") {
    await uploadUserProfileMedia(id, opaque, urls[0], "照片");
  } else if (target === "UserProfileVideo") {
    await uploadUserProfileMedia(id, opaque, urls[0], "视频");
  } else {
    throw generalBadRequestError(`Unknown upload target: ${target}`);
  }
}

async function uploadUserProfileMedia(
  userId: string,
  hmac: string,
  url: string,
  mediaType: "照片" | "视频",
) {
  await sequelize.transaction(async (transaction) => {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "profile"],
      transaction,
    });
    if (!user) throw notFoundError("用户", userId);

    // The `|| {}` is to be consistent with the logic in getUserProfile route
    const profile = user.profile || {};
    const localHmac = hmacChecksum(
      mediaType === "照片" ? profile["照片链接"] : profile["视频链接"],
    );

    if (hmac !== localHmac) {
      throw generalBadRequestError(
        `HMAC checksum mismatch: provided "${hmac}" vs local "${localHmac}". ` +
          `Update conflict?`,
      );
    }

    await user.update(
      {
        profile: {
          ...profile,
          [mediaType + "链接"]: url,
        },
      },
      { transaction },
    );
  });
}
