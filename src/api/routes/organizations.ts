import { z } from "zod";
import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import {
  zOrganization,
  zOrganizationWithMembers,
} from "../../shared/Organization";
import Role, { isPermitted } from "../../shared/Role";
import { noPermissionError, notFoundError } from "../errors";
import { minUserAttributes } from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";

export async function listOrganizations(transaction?: Transaction) {
  return await db.Organization.findAll({
    order: [["name", "ASC"]],
    transaction,
  });
}

const list = procedure
  .use(authUser())
  .output(z.array(zOrganization))
  .query(async () => {
    return await listOrganizations();
  });

export async function getOrganization(id: string, transaction?: Transaction) {
  const org = await db.Organization.findByPk(id, {
    include: [
      {
        model: db.User,
        as: "mentors",
        attributes: minUserAttributes,
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

const get = procedure
  .use(authUser())
  .input(z.string().uuid())
  .output(zOrganizationWithMembers)
  .query(async ({ input: id }) => {
    return await getOrganization(id);
  });

export async function createOrganization(
  input: { name: string; description: string | null },
  transaction?: Transaction,
) {
  return await db.Organization.create(input, { transaction });
}

const create = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
    }),
  )
  .output(zOrganization)
  .mutation(async ({ input }) => {
    return await createOrganization(input);
  });

export async function removeOrganization(
  id: string,
  transaction?: Transaction,
) {
  const org = await db.Organization.findByPk(id, { transaction });
  if (!org) {
    throw notFoundError("机构", id);
  }
  await org.destroy({ transaction });
}

const remove = procedure
  .use(authUser("OrgAdmin"))
  .input(z.string().uuid())
  .mutation(async ({ input: id }) => {
    await removeOrganization(id);
  });

export async function updateOrganizationDescription(
  me: { id: string; roles: Role[] },
  id: string,
  description: string | null,
  transaction?: Transaction,
) {
  const org = await db.Organization.findByPk(id, { transaction });
  if (!org) {
    throw notFoundError("机构", id);
  }

  const isOwner =
    (await db.OrganizationOwner.count({
      where: { organizationId: id, ownerId: me.id },
      transaction,
    })) > 0;

  if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
    throw noPermissionError("机构", id);
  }

  await org.update({ description }, { transaction });
}

const updateDescription = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string().uuid(),
      description: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { id, description } }) => {
    await updateOrganizationDescription(me, id, description);
  });

export async function joinOrganization(
  mentorId: string,
  organizationId: string,
  transaction?: Transaction,
) {
  await db.OrganizationMentor.findOrCreate({
    where: { organizationId, mentorId },
    transaction,
  });
}

const join = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: organizationId }) => {
    await joinOrganization(me.id, organizationId);
  });

export async function leaveOrganization(
  mentorId: string,
  organizationId: string,
  transaction?: Transaction,
) {
  await db.OrganizationMentor.destroy({
    where: { organizationId, mentorId },
    transaction,
  });
}

const leave = procedure
  .use(authUser("Mentor"))
  .input(z.string().uuid())
  .mutation(async ({ ctx: { me }, input: organizationId }) => {
    await leaveOrganization(me.id, organizationId);
  });

export async function removeMentorFromOrganization(
  me: { id: string; roles: Role[] },
  organizationId: string,
  mentorId: string,
  transaction?: Transaction,
) {
  const isOwner =
    (await db.OrganizationOwner.count({
      where: { organizationId, ownerId: me.id },
      transaction,
    })) > 0;

  if (!isPermitted(me.roles, "OrgAdmin") && !isOwner) {
    throw noPermissionError("机构", organizationId);
  }

  await db.OrganizationMentor.destroy({
    where: { organizationId, mentorId },
    transaction,
  });
}

const removeMentor = procedure
  .use(authUser())
  .input(
    z.object({
      organizationId: z.string().uuid(),
      mentorId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { organizationId, mentorId } }) => {
    await removeMentorFromOrganization(me, organizationId, mentorId);
  });

export async function addOrganizationOwner(
  organizationId: string,
  ownerId: string,
  transaction?: Transaction,
) {
  await db.OrganizationOwner.findOrCreate({
    where: { organizationId, ownerId },
    transaction,
  });
}

const addOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      organizationId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input: { organizationId, ownerId } }) => {
    await addOrganizationOwner(organizationId, ownerId);
  });

export async function removeOrganizationOwner(
  organizationId: string,
  ownerId: string,
  transaction?: Transaction,
) {
  await db.OrganizationOwner.destroy({
    where: { organizationId, ownerId },
    transaction,
  });
}

const removeOwner = procedure
  .use(authUser("OrgAdmin"))
  .input(
    z.object({
      organizationId: z.string().uuid(),
      ownerId: z.string().uuid(),
    }),
  )
  .mutation(async ({ input: { organizationId, ownerId } }) => {
    await removeOrganizationOwner(organizationId, ownerId);
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
