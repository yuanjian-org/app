import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Op } from "sequelize";
import { notFoundError, noPermissionError } from "../errors";
import { isPermitted } from "../../shared/Role";
import {
  Project,
  ProjectWithOwner,
  zProject,
  zProjectWithOwner,
  zProjectStatus,
  zProjectVisibility,
  ProjectStatus,
  ProjectVisibility,
} from "../../shared/Project";
import { zProjectProfile, ProjectProfile } from "../../shared/ProjectProfile";
import {
  projectInclude,
  projectAttributes,
} from "api/database/models/attributesAndIncludes";
import User from "../../shared/User";
import { Transaction } from "sequelize";

export async function listImpl(
  me: User,
  transaction?: Transaction,
): Promise<ProjectWithOwner[]> {
  const isProjectAdmin = isPermitted(me.roles, "ProjectAdmin");

  return (await db.Project.findAll({
    where: isProjectAdmin
      ? {}
      : {
          [Op.or]: [
            { ownerId: me.id },
            {
              status: "Open",
              visibility: "Public",
            },
          ],
        },
    attributes: projectAttributes,
    include: projectInclude,
    order: [["createdAt", "DESC"]],
    transaction,
  })) as ProjectWithOwner[]; // DB models are mapped to these types via include/attributes
}

const list = procedure
  .use(authUser())
  .output(z.array(zProjectWithOwner))
  .query(async ({ ctx: { me } }) => {
    return await listImpl(me);
  });

export async function getImpl(
  me: User,
  id: string,
  transaction?: Transaction,
): Promise<ProjectWithOwner> {
  const project = await db.Project.findByPk(id, {
    attributes: projectAttributes,
    include: projectInclude,
    transaction,
  });

  if (!project) {
    throw notFoundError("项目", id);
  }

  if (
    (project.visibility !== "Public" || project.status !== "Open") &&
    me.id !== project.ownerId &&
    !isPermitted(me.roles, "ProjectAdmin")
  ) {
    throw noPermissionError("项目", id);
  }

  return project as unknown as ProjectWithOwner;
}

const get = procedure
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zProjectWithOwner)
  .query(async ({ ctx: { me }, input }) => {
    return await getImpl(me, input.id);
  });

export async function createImpl(
  me: User,
  title: string,
  status: ProjectStatus,
  visibility: ProjectVisibility,
  profile: ProjectProfile,
  ownerId: string | undefined,
  transaction: Transaction,
): Promise<Project> {
  if (ownerId && ownerId !== me.id && !isPermitted(me.roles, "ProjectAdmin")) {
    throw noPermissionError("项目", "create");
  }

  return await db.Project.create(
    {
      ownerId: ownerId || me.id,
      title: title,
      status: status,
      visibility: visibility,
      profile: profile,
    },
    { transaction },
  );
}

const create = procedure
  .use(authUser(["Mentor", "ProjectAdmin"]))
  .input(
    z.object({
      title: z.string(),
      status: zProjectStatus,
      visibility: zProjectVisibility,
      profile: zProjectProfile,
      ownerId: z.string().optional(), // Admins can set ownerId
    }),
  )
  .output(zProject)
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (transaction) => {
      return await createImpl(
        me,
        input.title,
        input.status,
        input.visibility,
        input.profile,
        input.ownerId,
        transaction,
      );
    });
  });

export async function updateImpl(
  me: User,
  id: string,
  title: string | undefined,
  status: ProjectStatus | undefined,
  visibility: ProjectVisibility | undefined,
  profile: ProjectProfile | undefined,
  ownerId: string | undefined,
  transaction: Transaction,
): Promise<Project> {
  const project = await db.Project.findByPk(id, {
    attributes: projectAttributes,
    include: projectInclude,
    transaction,
  });

  if (!project) {
    throw notFoundError("项目", id);
  }

  if (project.ownerId !== me.id && !isPermitted(me.roles, "ProjectAdmin")) {
    throw noPermissionError("项目", id);
  }

  if (
    ownerId &&
    ownerId !== project.ownerId &&
    !isPermitted(me.roles, "ProjectAdmin")
  ) {
    throw noPermissionError("项目", id);
  }

  await project.update(
    {
      title,
      status,
      visibility,
      profile,
      ownerId,
    },
    { transaction },
  );
  return project;
}

const update = procedure
  .use(authUser(["Mentor", "ProjectAdmin"]))
  .input(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      status: zProjectStatus.optional(),
      visibility: zProjectVisibility.optional(),
      profile: zProjectProfile.optional(),
      ownerId: z.string().optional(), // Admins can update ownerId
    }),
  )
  .output(zProject)
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (transaction) => {
      return await updateImpl(
        me,
        input.id,
        input.title,
        input.status,
        input.visibility,
        input.profile,
        input.ownerId,
        transaction,
      );
    });
  });

export default router({
  list,
  get,
  create,
  update,
});
