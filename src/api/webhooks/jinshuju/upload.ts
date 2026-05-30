import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import {
  UploadTarget,
  validateAndDecodeXField,
} from "../../../shared/jinshuju";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";
import { calculateMediaHmac } from "../../utils/jinshujuHmac";

/**
 * The Webhook for 金数据 form ids Bz3uSO and nhFsf1.
 */
export default async function submit(entry: Record<string, any>) {
  const urls: string[] = entry.field_1;
  if (urls.length !== 1) {
    throw generalBadRequestError(`# urls isn't one: ${urls.length}`);
  }

  const decoded = validateAndDecodeXField(getWhiteLabel(), entry);
  if (!decoded) {
    throw generalBadRequestError(`Empty or malformed x_field_1`);
  }

  const { target, userId, hmac } = decoded;
  console.log("Upload target:", target);
  console.log("Upload userId:    ", userId);
  console.log("Upload hmac:", hmac);

  if (!target || !userId || !hmac) {
    throw generalBadRequestError(`Invalid target, userId, or hmac`);
  }

  if (target === "UserProfilePicture" || target === "UserProfileVideo") {
    await uploadUserProfileMedia(userId, hmac, urls[0], target);
  } else {
    throw generalBadRequestError(`Unknown upload target: ${target}`);
  }
}

async function uploadUserProfileMedia(
  userId: string,
  hmac: string,
  url: string,
  target: UploadTarget,
) {
  await sequelize.transaction(async (transaction) => {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "profile"],
      transaction,
    });
    if (!user) throw notFoundError("用户", userId);

    // The `|| {}` is to be consistent with the logic in getUserProfile route
    const profile = user.profile || {};
    const urlToHash =
      target === "UserProfilePicture"
        ? profile["照片链接"]
        : profile["视频链接"];
    const localHmac = calculateMediaHmac(userId, urlToHash);

    console.log("uploadUserProfileMedia verifying HMAC:");
    console.log("  userId:    ", userId);
    console.log("  urlToHash: ", urlToHash);
    console.log("  localHmac: ", localHmac);
    console.log("  hmac:      ", hmac);

    if (hmac !== localHmac) {
      throw generalBadRequestError(
        `HMAC checksum mismatch: provided "${hmac}" vs local "${localHmac}". ` +
          `Update conflict?`,
      );
    }

    const mediaType = target === "UserProfilePicture" ? "照片" : "视频";

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
