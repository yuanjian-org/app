import { z } from "zod";
import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { zOrg, zOrgWithMembers } from "../../shared/Org";
import { isPermitted } from "../../shared/Role";
import { noPermissionError, notFoundError } from "../errors";
import { minUserAttributes } from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import User from "../database/models/User";

export async function listOrgsImpl(transaction?: Transaction) {
  return await db.Org.findAll({
    order: [["name", "ASC"]],
    transaction,
  });
}

export async function getOrgImpl(id: string, transaction?: Transaction) {
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
    transaction,
  });

  if (!org) {
    throw notFoundError("机构", id);
  }

  return org as any;
}

export async function createOrgImpl(
  input: { name: string; description: string | null },
  transaction?: Transaction,
) {
  return await db.Org.create(input, { transaction });
}

export async function removeOrgImpl(id: string, transaction?: Transaction) {
  const org = await db.Org.findByPk(id, { transaction });
  if (!org) {
    throw notFoundError("机构", id);
  }
  await org.destroy({ transaction });
}

export async function updateOrgDescriptionImpl(
  me: User,
  input: { id: string; description: string | null },
  transaction?: Transaction,
) {
  const { id, description } = input;
  const org = await db.Org.findByPk(id, { transaction });
  if (!org) {
    throw notFoundError("机构", id);
  }

  const isOwner =
    (await db.OrgOwner.count({
      where: { orgId: id, ownerId: me.id },
      transaction,
    })) > 0;

  if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
    throw noPermissionError("机构", id);
  }

  await org.update({ description }, { transaction });
}

export async function joinOrgImpl(
  me: User,
  orgId: string,
  transaction?: Transaction,
) {
  await db.OrgMentor.findOrCreate({
    where: { orgId, mentorId: me.id },
    transaction,
  });
}

export async function leaveOrgImpl(
  me: User,
  orgId: string,
  transaction?: Transaction,
) {
  await db.OrgMentor.destroy({
    where: { orgId, mentorId: me.id },
    transaction,
  });
}

export async function removeMentorImpl(
  me: User,
  input: { orgId: string; mentorId: string },
  transaction?: Transaction,
) {
  const { orgId, mentorId } = input;
  const isOwner =
    (await db.OrgOwner.count({
      where: { orgId, ownerId: me.id },
      transaction,
    })) > 0;

  if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
    throw noPermissionError("机构", orgId);
  }

  await db.OrgMentor.destroy({
    where: { orgId, mentorId },
    transaction,
  });
}

export async function addOwnerImpl(
  input: { orgId: string; ownerId: string },
  transaction?: Transaction,
) {
  const { orgId, ownerId } = input;
  await db.OrgOwner.findOrCreate({
    where: { orgId, ownerId },
    transaction,
  });
}

export async function removeOwnerImpl(
  input: { orgId: string; ownerId: string },
  transaction?: Transaction,
) {
  const { orgId, ownerId } = input;
  await db.OrgOwner.destroy({
    where: { orgId, ownerId },
    transaction,
  });
}

const list = procedure
  .use(authUser())
  .output(z.array(zOrg))
  .query(async () => {
    return await listOrgsImpl();
  });

const get = procedure
  .use(authUser())
  .input(z.string().uuid())
  .output(zOrgWithMembers)
  .query(async ({ input: id }) => {
    return await getOrgImpl(id);
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
    return await createOrgImpl(input);
  });

const remove = procedure
  .use(authUser("OrgAdmin"))
  .input(z.string().uuid())
  .mutation(async ({ input: id }) => {
    await removeOrgImpl(id);
  });

const updateDescription = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string().uuid(),
      description: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await updateOrgDescriptionImpl(me, input);
  });

const join = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: orgId }) => {
    await joinOrgImpl(me, orgId);
  });

const leave = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: orgId }) => {
    await leaveOrgImpl(me, orgId);
  });

const removeMentor = procedure
  .use(authUser())
  .input(
    z.object({
      orgId: z.string().uuid(),
      mentorId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await removeMentorImpl(me, input);
  });

const addOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      orgId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input }) => {
    await addOwnerImpl(input);
  });

const removeOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      orgId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input }) => {
    await removeOwnerImpl(input);
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
