import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { Op } from "sequelize";
import { notFoundError, noPermissionError } from "../errors";
import { isPermitted } from "../../shared/Role";
import {
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

const list = procedure
  .use(authUser())
  .output(z.array(zProjectWithOwner))
  .query(async ({ ctx: { me } }) => {
    return await db.Project.findAll({
      where: {
        [Op.or]: [
          { ownerId: me.id },
          ...(isPermitted(me.roles, "ProjectAdmin")
            ? [{}] // ProjectAdmin sees all projects
            : []),
          {
            status: "Open",
            visibility: "Public",
          },
        ],
      },
      attributes: projectAttributes,
      include: projectInclude,
      order: [["createdAt", "DESC"]],
    });
  });

const get = procedure
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zProjectWithOwner)
  .query(async ({ ctx: { me }, input }) => {
    const project = await db.Project.findByPk(input.id, {
      attributes: projectAttributes,
      include: projectInclude,
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

    return project;
  });

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
    if (
      input.ownerId &&
      input.ownerId !== me.id &&
      !isPermitted(me.roles, "ProjectAdmin")
    ) {
      throw noPermissionError("项目", "create");
    }

    return await db.Project.create({
      ownerId: input.ownerId || me.id,
      title: input.title,
      status: input.status,
      visibility: input.visibility,
      profile: input.profile,
    });
  });

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
    const project = await db.Project.findByPk(input.id, {
      attributes: projectAttributes,
      include: projectInclude,
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

    await project.update(input);
    return project;
  });

export default router({
  list,
  get,
  create,
  update,
});
