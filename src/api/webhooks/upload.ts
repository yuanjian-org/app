import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError, notFoundError } from "../errors";
import db from "../database/db";
import { shaChecksum } from "shared/strings";
import { decodeUploadTokenUrlSafe } from "shared/upload";
import sequelize from "api/database/sequelize";

/**
 * The Webhook for 金数据 form https://jsj.top/f/Bz3uSO
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input: { form, entry } }) => 
{
  if (form !== "Bz3uSO") {
    throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }

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

  if (target === "MentorProfilePicture") {
    await uploadMentorProfilePicture(id, opaque, urls[0]);
  } else {
    throw generalBadRequestError(`Unknown upload target: ${target}`);
  }
});

async function uploadMentorProfilePicture(userId: string, sha: string,
  url: string) 
{
  await sequelize.transaction(async transaction => {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "mentorProfile"],
      transaction,
    });
    if (!user) throw notFoundError("用户", userId);

    // The `|| {}` is to be consistent with the logic in getMentorProfile route
    const profile = user.mentorProfile || {};
    const localSha = shaChecksum(profile);

    if (sha !== localSha) {
      throw generalBadRequestError(
        `SHA checksum mismatch: provided "${sha}" vs local "${localSha}". ` +
        `Update conflict?`);
    }

    await user.update({
      mentorProfile: {
        ...profile, 
        '照片链接': url,
      },
    }, { transaction });
  });
}
