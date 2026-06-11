import { projectApplicationFields } from "../../../shared/applicationFields";
import db from "../../database/db";
import { Transaction } from "sequelize";
import { validateAndDecodeXField } from "../../jinshuju";
import { notFoundError } from "../../errors";
import { getWhiteLabel } from "../../getWhiteLabel";

export async function submitProjectApp(
  entry: Record<string, any>,
  transaction: Transaction,
) {
  const application: Record<string, any> = {};
  for (const field of projectApplicationFields) {
    const jn = field.jsjField;
    if (jn && jn in entry) {
      application[field.name] = entry[jn];
    }
  }

  const [userId, projectId] = validateAndDecodeXField(getWhiteLabel(), entry);

  if (!projectId) {
    throw new Error("Missing projectId in x_field_1");
  }

  const project = await db.Project.findByPk(projectId, { transaction });
  if (!project) {
    throw notFoundError("项目", projectId);
  }

  const user = await db.User.findByPk(userId, { transaction });
  if (!user) {
    throw notFoundError("用户", userId);
  }

  await db.ProjectApplication.create(
    {
      projectId,
      userId,
      application,
    },
    { transaction },
  );
}
