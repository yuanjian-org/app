import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import { validateAndDecodeXField } from "../../jinshuju";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";
import { UserProfile } from "shared/UserProfile";

/**
 * The Webhook for 金数据 form ids Bz3uSO and nhFsf1.
 */
export default async function submit(form: string, entry: Record<string, any>) {
  const urls: string[] = entry.field_1;
  if (urls.length !== 1) {
    throw generalBadRequestError(`# urls isn't one but ${urls.length}`);
  }

  const [userId] = validateAndDecodeXField(getWhiteLabel(), entry);

  if (form === "Bz3uSO") {
    await uploadUserProfileMedia(userId, urls[0], "照片链接");
  } else if (form === "nhFsf1") {
    await uploadUserProfileMedia(userId, urls[0], "视频链接");
  } else {
    throw generalBadRequestError(`Unknown upload form: ${form}`);
  }
}

async function uploadUserProfileMedia(
  userId: string,
  url: string,
  mediaType: keyof UserProfile,
) {
  await sequelize.transaction(async (transaction) => {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "profile"],
      transaction,
    });
    if (!user) throw notFoundError("用户", userId);

    await user.update(
      {
        profile: {
          ...user.profile,
          [mediaType]: url,
        },
      },
      { transaction },
    );
  });
}
