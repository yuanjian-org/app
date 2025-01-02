import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import { shaChecksum } from "../../../shared/strings";
import { decodeUploadTokenUrlSafe } from "../../../shared/upload";
import sequelize from "../../database/sequelize";

/**
 * The Webhook for 金数据 form https://jsj.top/f/Bz3uSO
 */
export default async function submit(entry: Record<string, any>) {
  const urls: string[] = entry.field_1;
  if (urls.length !== 1) {
    throw generalBadRequestError(`# urls isn't one: ${urls.length}`);
  }

  const token = entry.x_field_1;
  if (!token) {
    throw generalBadRequestError(`Empty token in x_field_1`);
  }

  const { target, id, opaque } = decodeUploadTokenUrlSafe(token);
  console.log("Upload target:", target);
  console.log("Upload id:    ", id);
  console.log("Upload opaque:", opaque);

  if (!target || !id || !opaque) {
    throw generalBadRequestError(`Invalid target, id, or sha`);
  }

  if (target === "UserProfilePicture") {
    await uploadUserProfilePicture(id, opaque, urls[0]);
  } else {
    throw generalBadRequestError(`Unknown upload target: ${target}`);
  }
}

async function uploadUserProfilePicture(userId: string, sha: string,
  url: string) 
{
  await sequelize.transaction(async transaction => {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "profile"],
      transaction,
    });
    if (!user) throw notFoundError("用户", userId);

    // The `|| {}` is to be consistent with the logic in getUserProfile route
    const profile = user.profile || {};
    const localSha = shaChecksum(profile);

    if (sha !== localSha) {
      throw generalBadRequestError(
        `SHA checksum mismatch: provided "${sha}" vs local "${localSha}". ` +
        `Update conflict?`);
    }

    await user.update({
      profile: {
        ...profile,
        '照片链接': url,
      },
    }, { transaction });
  });
}
