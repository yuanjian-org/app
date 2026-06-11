import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { notFoundError, noPermissionError } from "../errors";
import { isPermitted } from "../../shared/Role";
import {
  ProjectApplicationStatus,
  zProjectApplicationStatus,
  zProjectApplicationWithUser,
} from "../../shared/ProjectApplication";
import {
  projectApplicationInclude,
  projectApplicationAttributes,
} from "../database/models/attributesAndIncludes";
import User from "../../shared/User";
import { Transaction } from "sequelize";

export async function checkProjectPermission(
  me: User,
  projectId: string,
  transaction?: Transaction,
): Promise<void> {
  if (isPermitted(me.roles, "ProjectAdmin")) {
    return;
  }

  const project = await db.Project.findByPk(projectId, {
    attributes: ["ownerId"],
    transaction,
  });
  if (!project) {
    throw notFoundError("项目", projectId);
  }

  if (project.ownerId !== me.id) {
    throw noPermissionError("项目", projectId);
  }
}

export async function listImpl(
  me: User,
  projectId: string,
  transaction: Transaction,
) {
  await checkProjectPermission(me, projectId, transaction);

  return await db.ProjectApplication.findAll({
    where: { projectId },
    attributes: projectApplicationAttributes,
    include: projectApplicationInclude,
    order: [["createdAt", "DESC"]],
    transaction,
  });
}

const list = procedure
  .use(authUser())
  .input(z.object({ projectId: z.string() }))
  .output(z.array(zProjectApplicationWithUser))
  .query(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (transaction) => {
      return await listImpl(me, input.projectId, transaction);
    });
  });

export async function updateStatusImpl(
  me: User,
  id: string,
  status: ProjectApplicationStatus,
  transaction: Transaction,
) {
  const app = await db.ProjectApplication.findByPk(id, {
    attributes: ["id", "projectId"],
    transaction,
  });

  if (!app) {
    throw notFoundError("申请表", id);
  }

  await checkProjectPermission(me, app.projectId, transaction);

  await app.update({ status }, { transaction });
}

const updateStatus = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string(),
      status: zProjectApplicationStatus,
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (transaction) => {
      return await updateStatusImpl(me, input.id, input.status, transaction);
    });
  });

export default router({
  list,
  updateStatus,
});
