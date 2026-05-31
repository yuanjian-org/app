import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import { validateAndDecodeXField } from "../../jinshuju";
import sequelize from "../../database/sequelize";
import { getWhiteLabel } from "../../getWhiteLabel";

/**
 * The Webhook for 金数据 form ids Bz3uSO and nhFsf1.
 */
export default async function submit(form: string, entry: Record<string, any>) {
  const urls: string[] = entry.field_1;
  if (urls.length !== 1) {
    throw generalBadRequestError(`# urls isn't one: ${urls.length}`);
  }

  const userId = validateAndDecodeXField(getWhiteLabel(), entry);

  console.log("Upload form:  ", form);
  console.log("Upload id:    ", userId);

  if (form === "Bz3uSO") {
    await uploadUserProfileMedia(userId, urls[0], "照片");
  } else if (form === "nhFsf1") {
    await uploadUserProfileMedia(userId, urls[0], "视频");
  } else {
    throw generalBadRequestError(`Unknown upload target form: ${form}`);
  }
}

async function uploadUserProfileMedia(
  userId: string,
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
