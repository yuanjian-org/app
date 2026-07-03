import { whiteLabel } from "shared/WhiteLabel";
import { generalBadRequestError, notFoundError } from "../../errors";
import db from "../../database/db";
import { validateAndDecodeXField } from "../../jinshuju";
import sequelize from "../../database/sequelize";
import { UserProfile } from "shared/UserProfile";
import { ProjectProfile } from "shared/ProjectProfile";
import { noPermissionError } from "../../errors";
import { isPermitted } from "shared/Role";

/**
 * The Webhook for 金数据 form ids Bz3uSO and nhFsf1.
 *
 * Protocol for x-field in Jinshuju:
 * The `x_field_1` token contains comma-separated values encoded by `encodeXField()`.
 * `validateAndDecodeXField()` extracts:
 *   - [0]: `userId`
 *   - [1]: `target` (either "user" or "project", defaults to "user" for backward compatibility)
 *   - [2]: `projectId` (only present when `target` is "project")
 *
 * Based on the `target`, `uploadProfileMedia()` knows whether to update the
 * User's profile or a specific Project's profile.
 */
export default async function submit(form: string, entry: Record<string, any>) {
  const urls: string[] = entry.field_1;

  const [userId, uploadTarget, projectId] = validateAndDecodeXField(
    whiteLabel,
    entry,
  );

  if (uploadTarget !== "user" && uploadTarget !== "project") {
    throw generalBadRequestError(`Unknown target: ${uploadTarget}`);
  }

  if (form === "Bz3uSO") {
    if (urls.length !== 1) {
      throw generalBadRequestError(`# urls isn't one but ${urls.length}`);
    }
    await uploadProfileMedia(
      userId,
      uploadTarget,
      projectId,
      urls[0],
      "照片链接",
    );
  } else if (form === "nhFsf1") {
    if (urls.length !== 1) {
      throw generalBadRequestError(`# urls isn't one but ${urls.length}`);
    }
    await uploadProfileMedia(
      userId,
      uploadTarget,
      projectId,
      urls[0],
      "视频链接",
    );
  } else if (form === "RefMatFormId") {
    const markdownLinks = urls.map((url) => `- ${url}`).join("\n");
    await uploadProfileMedia(
      userId,
      uploadTarget,
      projectId,
      markdownLinks,
      "参考材料",
    );
  } else {
    throw generalBadRequestError(`Unknown upload form: ${form}`);
  }
}

async function uploadProfileMedia(
  userId: string,
  uploadTarget: "user" | "project",
  projectId: string | undefined,
  url: string,
  mediaType: keyof UserProfile | keyof ProjectProfile,
) {
  await sequelize.transaction(async (transaction) => {
    if (uploadTarget === "project") {
      if (!projectId) {
        throw generalBadRequestError(
          "projectId is required when target is project",
        );
      }

      const project = await db.Project.findByPk(projectId, {
        attributes: ["id", "profile", "ownerId"],
        transaction,
      });
      if (!project) throw notFoundError("项目", projectId);

      const user = await db.User.findByPk(userId, {
        attributes: ["id", "roles"],
        transaction,
      });
      if (!user) throw notFoundError("用户", userId);

      if (
        project.ownerId !== userId &&
        !isPermitted(user.roles, "ProjectAdmin")
      ) {
        throw noPermissionError("项目", projectId);
      }

      await project.update(
        {
          profile: {
            ...project.profile,
            [mediaType]: url,
          },
        },
        { transaction },
      );
    } else {
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
    }
  });
}
