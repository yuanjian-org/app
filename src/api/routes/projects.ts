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
  ProjectWithAssociation,
  zProject,
  zProjectWithAssociation,
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
  me?: User,
  orgId?: string,
  transaction?: Transaction,
): Promise<ProjectWithAssociation[]> {
  const isProjectAdmin = me ? isPermitted(me.roles, "ProjectAdmin") : false;

  const baseWhere: any = isProjectAdmin
    ? {}
    : me
      ? {
          [Op.or]: [
            { ownerId: me.id },
            {
              status: "招募中",
              visibility: "公开",
            },
          ],
        }
      : {
          status: "招募中",
          visibility: "公开",
        };

  if (orgId) {
    baseWhere.orgId = orgId;
  }

  return await db.Project.findAll({
    where: baseWhere,
    attributes: projectAttributes,
    include: projectInclude,
    order: [["createdAt", "DESC"]],
    transaction,
  });
}

const list = procedure
  .use(authUser())
  .input(z.object({ orgId: z.string().optional() }).optional())
  .output(z.array(zProjectWithAssociation))
  .query(async ({ ctx: { me }, input }) => {
    return await listImpl(me, input?.orgId);
  });

export async function getImpl(
  me: User | undefined,
  id: string,
  transaction?: Transaction,
): Promise<ProjectWithAssociation> {
  const project = await db.Project.findByPk(id, {
    attributes: projectAttributes,
    include: projectInclude,
    transaction,
  });

  if (!project) {
    throw notFoundError("项目", id);
  }

  const isProjectAdmin = me ? isPermitted(me.roles, "ProjectAdmin") : false;
  if (
    (project.visibility !== "公开" || project.status !== "招募中") &&
    (!me || me.id !== project.ownerId) &&
    !isProjectAdmin
  ) {
    throw noPermissionError("项目", id);
  }

  return project;
}

const get = procedure
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zProjectWithAssociation)
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
  orgId: string | null | undefined,
  transaction: Transaction,
): Promise<Project> {
  if (ownerId && ownerId !== me.id && !isPermitted(me.roles, "ProjectAdmin")) {
    throw noPermissionError("项目", "create");
  }

  return await db.Project.create(
    {
      ownerId: ownerId || me.id,
      orgId,
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
      orgId: z.string().nullish(),
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
        input.orgId,
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
  orgId: string | undefined | null,
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
      orgId,
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
      ownerId: z.string().optional(),
      orgId: z.string().nullish(),
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
        input.orgId,
        transaction,
      );
    });
  });

const listPublic = procedure
  .output(z.array(zProjectWithAssociation))
  .query(async () => {
    return await listImpl();
  });

const getPublic = procedure
  .input(z.object({ id: z.string() }))
  .output(zProjectWithAssociation)
  .query(async ({ input }) => {
    return await getImpl(undefined, input.id);
  });

export default router({
  list,
  get,
  create,
  update,
  listPublic,
  getPublic,
});
