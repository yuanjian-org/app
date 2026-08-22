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
  .use(authUser("GroupAdmin"))
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
  .use(authUser("GroupAdmin"))
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
    // SQL complains that "FOR UPDATE cannot be applied to the nullable side
    // of an outer join" if GroupUser is included.
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

async function getGroupWithIdOnly(groupId: string, transaction?: Transaction) {
  const group = await db.Group.findByPk(groupId, {
    attributes: ["id"],
    transaction,
  });
  if (!group) throw notFoundError("分组", groupId);
  return group;
}

export async function destroyGroup(groupId: string, transaction?: Transaction) {
  const g = await getGroupWithIdOnly(groupId, transaction);
  if (transaction) {
    await g.destroy({ transaction });
  } else {
    // Need a transaction for cascading destroys
    await sequelize.transaction(
      async (t) => await g.destroy({ transaction: t }),
    );
  }
}

const destroy = procedure
  .use(authUser("GroupAdmin"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    await destroyGroup(input.groupId);
  });

export async function archiveGroup(groupId: string, transaction?: Transaction) {
  const g = await getGroupWithIdOnly(groupId, transaction);
  await g.update({ archived: true }, { transaction });
}

const archive = procedure
  .use(authUser("GroupAdmin"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    await archiveGroup(input.groupId);
  });

export async function unarchiveGroup(
  groupId: string,
  transaction?: Transaction,
) {
  const g = await getGroupWithIdOnly(groupId, transaction);
  await g.update({ archived: false }, { transaction });
}

const unarchive = procedure
  .use(authUser("GroupAdmin"))
  .input(z.object({ groupId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    await unarchiveGroup(input.groupId);
  });

const whereUnowned = {
  partnershipId: null,
  interviewId: null,
};

/**
 * @param includeUnowned Whether to include unowned groups.
 * A group is unowned if and only if its partnershipId is null.
 */
export async function listMyGroups(
  userId: string,
  includeOwned: boolean,
  transaction?: Transaction,
) {
  return (
    (
      await db.GroupUser.findAll({
        where: {
          userId,
        },
        include: [
          {
            model: db.Group,
            attributes: groupAttributes,
            include: groupInclude,
            where: {
              archived: false,
              ...(includeOwned ? {} : whereUnowned),
            },
          },
        ],
        transaction,
      })
    )
      .map((groupUser) => groupUser.group)
      // Filter out groups owned by interviews. We currently ask users to
      // conduct
      // interviews using WeChat calls.
      .filter((g) => !g.interviewId)
  );
}

const listMine = procedure
  .use(authUser())
  .input(
    z.object({
      includeOwned: z.boolean(),
    }),
  )
  .output(z.array(zGroup))
  .query(async ({ ctx: { me }, input }) => {
    return await listMyGroups(me.id, input.includeOwned);
  });

/**
 * @param userIds Return all the groups if `userIds` is empty, otherwise groups that contains the given users.
 * @param includeUnowned Whether to include unowned groups. A group is unowned iff. its partnershipId is null.
 */
export async function listGroups(
  userIds: string[],
  includeOwned: boolean,
  includeArchived: boolean,
  transaction?: Transaction,
) {
  const where = {
    ...(includeArchived ? {} : { archived: false }),
    ...(includeOwned ? {} : whereUnowned),
  };

  if (userIds.length === 0) {
    return await db.Group.findAll({
      attributes: groupAttributes,
      include: groupInclude,
      where,
      transaction,
    });
  } else {
    const gs = await findGroups(
      userIds,
      "inclusive",
      groupInclude,
      where,
      transaction,
    );
    return gs as Group[];
  }
}

const list = procedure
  .use(authUser(["GroupAdmin"]))
  .input(
    z.object({
      userIds: z.string().array(),
      includeOwned: z.boolean(),
      includeArchived: z.boolean(),
    }),
  )
  .output(z.array(zGroup))
  .query(async ({ input: { userIds, includeOwned, includeArchived } }) => {
    return await listGroups(userIds, includeOwned, includeArchived);
  });

export async function getGroup(
  id: string,
  user: User,
  transaction?: Transaction,
) {
  const g = await db.Group.findByPk(id, {
    attributes: groupAttributes,
    include: groupInclude,
    transaction,
  });
  if (!g) throw notFoundError("分组", id);
  checkPermissionForGroup(user, g);
  return g;
}

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zGroup)
  .query(async ({ input: id, ctx: { me } }) => {
    return await getGroup(id, me);
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
  transaction?: Transaction,
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
    transaction,
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
