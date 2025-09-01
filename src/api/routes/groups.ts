import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { Includeable, Transaction } from "sequelize";
import invariant from "tiny-invariant";
import sequelize from "../database/sequelize";
import { noPermissionError, notFoundError } from "../errors";
import {
  Group,
  isPermittedToAccessGroup,
  isPermittedToAccessGroupHistory,
  zGroup,
} from "../../shared/Group";
import {
  groupAttributes,
  groupInclude,
} from "../database/models/attributesAndIncludes";
import User from "shared/User";

const create = procedure
  .use(authUser("GroupManager"))
  .input(
    z.object({
      userIds: z.array(z.string()).min(1),
    }),
  )
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (t) => {
      await createGroup(null, input.userIds, null, null, t);
    });
  });

const update = procedure
  .use(authUser("GroupManager"))
  .input(zGroup)
  .mutation(async ({ input }) => {
    const newUserIds = input.users.map((u) => u.id);
    await sequelize.transaction(
      async (t) =>
        await updateGroup(input.id, input.name, input.public, newUserIds, t),
    );
  });

/**
 * @returns The user ids that are added to the group.
 */
export async function updateGroup(
  id: string,
  name: string | null,
  isPublic: boolean,
  userIds: string[],
  transaction: Transaction,
) {
  const addUserIds: string[] = [];
  const group = await db.Group.findByPk(id, {
    // SQL complains that "FOR UPDATE cannot be applied to the nullable side of an outer join" if GroupUser is included.
    // include: db.GroupUser,
    transaction,
    lock: true,
  });
  if (!group) throw notFoundError("分组", id);

  const groupUsers = await db.GroupUser.findAll({
    where: { groupId: id },
    transaction,
    lock: true,
  });

  // Delete old users
  let deleted = false;
  for (const oldGU of groupUsers) {
    if (!userIds.includes(oldGU.userId)) {
      await oldGU.destroy({ transaction });
      deleted = true;
    }
  }

  // Update group itself
  await group.update(
    {
      // Set to null if the input is an empty string.
      name: name || null,
      public: isPublic,
      // Reset the meeting link to prevent deleted users from reusing it.
      ...(deleted
        ? {
            meetingLink: null,
          }
        : {}),
    },
    { transaction },
  );

  // Add new users
  const oldUserIds = groupUsers.map((gu) => gu.userId);
  addUserIds.push(...userIds.filter((uid) => !oldUserIds.includes(uid)));
  const promises = addUserIds.map(async (uid) => {
    // upsert because the matching row may have been previously deleted.
    await db.GroupUser.upsert(
      {
        groupId: id,
        userId: uid,
        deletedAt: null,
      },
      { transaction },
    );
  });
  await Promise.all(promises);

  return addUserIds;
}

async function getGroupWithIdOnly(groupId: string) {
  const group = await db.Group.findByPk(groupId, {
    attributes: ["id"],
  });
  if (!group) throw notFoundError("分组", groupId);
  return group;
}

const destroy = procedure
  .use(authUser("GroupManager"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    const g = await getGroupWithIdOnly(input.groupId);
    // Need a transaction for cascading destroys
    await sequelize.transaction(
      async (transaction) => await g.destroy({ transaction }),
    );
  });

const archive = procedure
  .use(authUser("GroupManager"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    const g = await getGroupWithIdOnly(input.groupId);
    await g.update({ archived: true });
  });

const unarchive = procedure
  .use(authUser("GroupManager"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    const g = await getGroupWithIdOnly(input.groupId);
    await g.update({ archived: false });
  });

const whereUnowned = {
  partnershipId: null,
  interviewId: null,
};

/**
 * @param includeUnowned Whether to include unowned groups.
 * A group is unowned if and only if its partnershipId is null.
 */
const listMine = procedure
  .use(authUser())
  .input(
    z.object({
      includeOwned: z.boolean(),
    }),
  )
  .output(z.array(zGroup))
  .query(async ({ ctx, input }) => {
    return (
      (
        await db.GroupUser.findAll({
          where: {
            userId: ctx.user.id,
          },
          include: [
            {
              model: db.Group,
              attributes: groupAttributes,
              include: groupInclude,
              where: {
                archived: false,
                ...(input.includeOwned ? {} : whereUnowned),
              },
            },
          ],
        })
      )
        .map((groupUser) => groupUser.group)
        // Filter out groups owned by interviews. We currently ask users to conduct
        // interviews using WeChat calls.
        .filter((g) => !g.interviewId)
    );
  });

/**
 * @param userIds Return all the groups if `userIds` is empty, otherwise groups that contains the given users.
 * @param includeUnowned Whether to include unowned groups. A group is unowned iff. its partnershipId is null.
 */
const list = procedure
  .use(authUser(["GroupManager"]))
  .input(
    z.object({
      userIds: z.string().array(),
      includeOwned: z.boolean(),
      includeArchived: z.boolean(),
    }),
  )
  .output(z.array(zGroup))
  .query(async ({ input: { userIds, includeOwned, includeArchived } }) => {
    const where = {
      ...(includeArchived ? {} : { archived: false }),
      ...(includeOwned ? {} : whereUnowned),
    };

    if (userIds.length === 0) {
      return await db.Group.findAll({
        attributes: groupAttributes,
        include: groupInclude,
        where,
      });
    } else {
      const gs = await findGroups(userIds, "inclusive", groupInclude, where);
      return gs as Group[];
    }
  });

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zGroup)
  .query(async ({ input: id, ctx }) => {
    const g = await db.Group.findByPk(id, {
      attributes: groupAttributes,
      include: groupInclude,
    });
    if (!g) throw notFoundError("分组", id);
    checkPermissionForGroup(ctx.user, g);
    return g;
  });

export default router({
  create,
  update,
  archive,
  unarchive,
  destroy,
  list,
  listMine,
  get,
});

export function checkPermissionForGroup(u: User, g: Group) {
  if (!isPermittedToAccessGroup(u, g)) throw noPermissionError("分组", g.id);
}

export function checkPermissionForGroupHistory(u: User, g: Group) {
  if (!isPermittedToAccessGroupHistory(u, g))
    throw noPermissionError("分组", g.id);
}

/**
 * @returns groups that contain all the given users.
 * @param mode if `exclusive`, return the singleton group that contains no more other users, or an empty array if no
 * such group exists.
 * @param includes Optional `include`s in the returned group.
 */
export async function findGroups(
  userIds: string[],
  mode: "inclusive" | "exclusive",
  includes?: Includeable[],
  additionalWhere?: { [k: string]: any },
): Promise<Group[]> {
  invariant(userIds.length > 0);

  const gus = await db.GroupUser.findAll({
    where: {
      userId: userIds[0],
    },
    include: [
      {
        model: db.Group,
        attributes: groupAttributes,
        include: [db.GroupUser, ...(includes || [])],
        where: additionalWhere,
      },
    ],
  });

  const res = gus
    .filter((gu) => {
      const groupUserIds = gu.group.groupUsers.map((gu) => gu.userId);
      const isSubset = userIds.every((uid) => groupUserIds.includes(uid));
      return (
        isSubset &&
        (mode === "inclusive" || userIds.length === groupUserIds.length)
      );
    })
    .map((gu) => gu.group);

  invariant(mode === "inclusive" || res.length <= 1);
  return res;
}

/**
 * @returns the created group id
 */
export async function createGroup(
  name: string | null,
  userIds: string[],
  partnershipId: string | null,
  interviewId: string | null,
  transaction: Transaction,
): Promise<string> {
  invariant(!partnershipId || !interviewId);

  const g = await db.Group.create(
    {
      name,
      partnershipId,
      interviewId,
    },
    { transaction },
  );
  await db.GroupUser.bulkCreate(
    userIds.map((userId) => ({
      userId,
      groupId: g.id,
    })),
    { transaction },
  );
  return g.id;
}
