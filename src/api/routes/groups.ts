import { procedure, router } from "../tServer";
import { z } from "zod";
import { authUser } from "../auth";
import Group from "../database/models/Group";
import GroupUser from "../database/models/GroupUser";
import { Op } from "sequelize";
import User from "../database/models/User";
import { presentPublicGroup } from "../../shared/publicModels/PublicGroup";
import PublicUser from "../../shared/publicModels/PublicUser";
import { TRPCError } from "@trpc/server";

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

const groups = router({
  create: procedure.use(
    authUser('groups:write')
  ).input(z.object({
    meetingLink: z.string().nullable(),
    userIdList: z.array(z.string()).min(2),
  })).mutation(async ({ input, ctx }) => {
    // TODO guard duplicate
    const existing = await GroupUser.findAll({
      where: {
        userId: input.userIdList[0],
      }
    });

    const inputUserIdSet = new Set(input.userIdList);
    const groupIdList = dedupe(existing.map(gu => gu.groupId));
    // console.log('existing', JSON.stringify(existing.map(e => e.id)), JSON.stringify(groupIdList));
    for (const groupId of groupIdList) {
      const userList = await GroupUser.findAll({
        where: {
          groupId: groupId,
        }
      });
      // console.log('iterating ', JSON.stringify(userList));
      if (areStringSetsEqual(
        new Set(userList.map(u => u.userId)),
        inputUserIdSet
      )) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'group exists!'
        });
      }
    }

    const group = await Group.create({
      meetingLink: input.meetingLink,
    });

    const groupUsers = await GroupUser.bulkCreate(input.userIdList.map(userId => ({
      userId: userId,
      groupId: group.id,
    })));

    return {
      group,
      groupUsers,
    }
  }),
  list: procedure.use(
    authUser('groups:read')
  ).input(z.object({
    userIdList: z.string().array(),
    // offset: z.number(),
    // limit: z.number(),
  })).query(async ({ input, ctx }) => {
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
});

export default groups;
