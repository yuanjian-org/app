import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import Group from "../database/models/Group";
import GroupUser from "../database/models/GroupUser";
import { Op } from "sequelize";
import User from "../database/models/User";
import { presentPublicGroup } from "../../shared/PublicGroup";
import PublicUser from "../../shared/PublicUser";
import { TRPCError } from "@trpc/server";
import Transcript from "../database/models/Transcript";
import Summary from "../database/models/Summary";

function isSubset<T>(superset: Set<T>, subset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}

function areStringSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
  const array1 = Array.from(set1);
  const array2 = Array.from(set2);
  array1.sort();
  array2.sort();
  return JSON.stringify(array1) === JSON.stringify(array2);
}

const dedupe = <T>(list: T[]) => [...new Set(list)];

const zGetGroupResponse = z.object({
  id: z.string(),
  transcripts: z.array(z.object({
    transcriptId: z.string(),
    startedAt: z.date(),
    endedAt: z.date(),
    summaries: z.array(z.object({
        summaryKey: z.string(),
    }))
  })),
  users: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
  }))
});

export type GetGroupResponse = z.TypeOf<typeof zGetGroupResponse>;

const groups = router({

  create: procedure
  .use(authUser('ADMIN'))
  .input(z.object({
    userIds: z.array(z.string()).min(2),
  }))
  .mutation(async ({ input }) => {
    return await createGroup(input.userIds);
  }),

  list: procedure
  .use(authUser('ADMIN'))
  .input(z.object({
    userIdList: z.string().array(),
  }))
  .query(async ({ input }) => {
    const groupUserList = await GroupUser.findAll({
      where: {
        ...(input.userIdList.length ? {
          userId: {
            [Op.in]: input.userIdList
          }
        } : {
        })
      },
    });

    const userIdSet = new Set(input.userIdList);

    const groupList = (await Group.findAll({
      include: {
        model: User,
      },
      where: {
        id: {
          [Op.in]: groupUserList.map(gu => gu.groupId),
        }
      }
    })).filter(g => {
      console.log('comparing', new Set(g.users.map(u => u.id)),
        userIdSet);
      return isSubset(
        new Set(g.users.map(u => u.id)),
        userIdSet
      );
    });

    const userMap = {} as Record<string, PublicUser>;
    for (const g of groupList) {
      g.users.forEach(u => {
        if (!userMap[u.id]) {
          userMap[u.id] = u;
        }
      });
    }

    return {
      groupList: groupList.map(presentPublicGroup),
      userMap,
    };
  }),

  get: procedure
  // We will throw access denied later if the user isn't a privileged user and isn't in the group.
  .use(authUser())
  .input(z.object({ id: z.string().uuid() }))
  .output(zGetGroupResponse)
  .query(async ({ input, ctx }) => {
    const g = await Group.findByPk(input.id, {
      include: [{
        model: User,
        attributes: ['id', 'name'],
      }, {
        model: Transcript,
        include: [{
          model: Summary,
          attributes: [ 'summaryKey' ]  // Caller should only need to get the summary count.
        }]
      }]
    });
    if (!g) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Group ${input.id} not found` });
    } else if (!g.users.some(u => u.id === ctx.user.id )) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `User has no access to Group ${input.id}` });
    }
    return g;
  })
});

export default groups;

export const GROUP_ALREADY_EXISTS_ERROR_MESSAGE = 'Group already exists.';

export async function createGroup(userIds: string[]) {
  // TODO: Optimize db queries. Refer to generateTestData.findGroup().
  const existing = await GroupUser.findAll({
    where: {
      userId: userIds[0],
    }
  });

  const inputUserIds = new Set(userIds);
  const groupIds = dedupe(existing.map(gu => gu.groupId));
  for (const groupId of groupIds) {
    const userList = await GroupUser.findAll({
      where: {
        groupId: groupId,
      }
    });
    if (areStringSetsEqual(
      new Set(userList.map(u => u.userId)),
      inputUserIds
    )) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: GROUP_ALREADY_EXISTS_ERROR_MESSAGE,
      });
    }
  }

  const group = await Group.create({});

  const groupUsers = await GroupUser.bulkCreate(userIds.map(userId => ({
    userId: userId,
    groupId: group.id,
  })));

  return {
    group,
    groupUsers,
  }
}
