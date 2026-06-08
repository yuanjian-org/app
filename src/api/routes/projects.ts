import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
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
} from "../../shared/Project";
import { zProjectProfile } from "../../shared/ProjectProfile";
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
  })) as any as ProjectWithOwner[]; // DB models are mapped to these types via include/attributes
}

const list = procedure
  .use(authUser())
  .output(z.array(zProjectWithOwner))
  .query(async ({ ctx: { me } }) => {
    return await listImpl(me);
  });

export async function getImpl(
  me: User,
  input: { id: string },
  transaction?: Transaction,
): Promise<ProjectWithOwner> {
  const project = await db.Project.findByPk(input.id, {
    attributes: projectAttributes,
    include: projectInclude,
    transaction,
  });

  if (!project) {
    throw notFoundError("项目", input.id);
  }

  if (
    (project.visibility !== "Public" || project.status !== "Open") &&
    me.id !== project.ownerId &&
    !isPermitted(me.roles, "ProjectAdmin")
  ) {
    throw noPermissionError("项目", input.id);
  }

  return project as any as ProjectWithOwner;
}

const get = procedure
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zProjectWithOwner)
  .query(async ({ ctx: { me }, input }) => {
    return await getImpl(me, input);
  });

export async function createImpl(
  me: User,
  input: {
    title: string;
    status: "Draft" | "Open" | "Closed";
    visibility: "Public" | "Confidential";
    profile: any;
    ownerId?: string;
  },
  transaction?: Transaction,
): Promise<Project> {
  if (
    input.ownerId &&
    input.ownerId !== me.id &&
    !isPermitted(me.roles, "ProjectAdmin")
  ) {
    throw noPermissionError("项目", "create");
  }

  return await db.Project.create(
    {
      ownerId: input.ownerId || me.id,
      title: input.title,
      status: input.status,
      visibility: input.visibility,
      profile: input.profile,
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
    return await createImpl(me, input);
  });

export async function updateImpl(
  me: User,
  input: {
    id: string;
    title?: string;
    status?: "Draft" | "Open" | "Closed";
    visibility?: "Public" | "Confidential";
    profile?: any;
    ownerId?: string;
  },
  transaction?: Transaction,
): Promise<Project> {
  const project = await db.Project.findByPk(input.id, {
    attributes: projectAttributes,
    include: projectInclude,
    transaction,
  });

  if (!project) {
    throw notFoundError("项目", input.id);
  }

  if (project.ownerId !== me.id && !isPermitted(me.roles, "ProjectAdmin")) {
    throw noPermissionError("项目", input.id);
  }

  if (
    input.ownerId &&
    input.ownerId !== project.ownerId &&
    !isPermitted(me.roles, "ProjectAdmin")
  ) {
    throw noPermissionError("项目", input.id);
  }

  await project.update(input, { transaction });
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
    return await updateImpl(me, input);
  });

export default router({
  list,
  get,
  create,
  update,
});
