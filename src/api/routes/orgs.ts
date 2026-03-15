import { z } from "zod";
import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { zOrg, zOrgWithMembers } from "../../shared/Org";
import { isPermitted } from "../../shared/Role";
import { noPermissionError, notFoundError } from "../errors";
import { minUserAttributes } from "../database/models/attributesAndIncludes";

const list = procedure
  .use(authUser())
  .output(z.array(zOrg))
  .query(async () => {
    return await db.Org.findAll({
      order: [["name", "ASC"]],
    });
  });

const get = procedure
  .use(authUser())
  .input(z.string().uuid())
  .output(zOrgWithMembers)
  .query(async ({ input: id }) => {
    const org = await db.Org.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "mentors",
          attributes: [...minUserAttributes, "profile", "roles"],
        },
        {
          model: db.User,
          as: "owners",
          attributes: minUserAttributes,
        },
      ],
    });

    if (!org) {
      throw notFoundError("机构", id);
    }

    return org as any;
  });

const create = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
    }),
  )
  .output(zOrg)
  .mutation(async ({ input }) => {
    return await db.Org.create(input);
  });

const remove = procedure
  .use(authUser("OrgAdmin"))
  .input(z.string().uuid())
  .mutation(async ({ input: id }) => {
    const org = await db.Org.findByPk(id);
    if (!org) {
      throw notFoundError("机构", id);
    }
    await org.destroy();
  });

const updateDescription = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string().uuid(),
      description: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { id, description } }) => {
    const org = await db.Org.findByPk(id);
    if (!org) {
      throw notFoundError("机构", id);
    }

    const isOwner =
      (await db.OrgOwner.count({
        where: { orgId: id, ownerId: me.id },
      })) > 0;

    if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
      throw noPermissionError("机构", id);
    }

    await org.update({ description });
  });

const join = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: orgId }) => {
    await db.OrgMentor.findOrCreate({
      where: { orgId, mentorId: me.id },
    });
  });

const leave = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: orgId }) => {
    await db.OrgMentor.destroy({
      where: { orgId, mentorId: me.id },
    });
  });

const removeMentor = procedure
  .use(authUser())
  .input(
    z.object({
      orgId: z.string().uuid(),
      mentorId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { orgId, mentorId } }) => {
    const isOwner =
      (await db.OrgOwner.count({
        where: { orgId, ownerId: me.id },
      })) > 0;

    if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
      throw noPermissionError("机构", orgId);
    }

    await db.OrgMentor.destroy({
      where: { orgId, mentorId },
    });
  });

const addOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      orgId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input: { orgId, ownerId } }) => {
    await db.OrgOwner.findOrCreate({
      where: { orgId, ownerId },
    });
  });

const removeOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      orgId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input: { orgId, ownerId } }) => {
    await db.OrgOwner.destroy({
      where: { orgId, ownerId },
    });
  });

export default router({
  list,
  get,
  create,
  remove,
  updateDescription,
  join,
  leave,
  removeMentor,
  addOwner,
  removeOwner,
});
