import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import DBGroup from "../database/models/Group";
import GroupUser from "../database/models/GroupUser";
import { Includeable } from "sequelize";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import Transcript from "../database/models/Transcript";
import Summary from "../database/models/Summary";
import invariant from "tiny-invariant";
import _ from "lodash";
import { isPermitted } from "../../shared/Role";
import { useId } from "react";
import sequelizeInstance from "api/database/sequelizeInstance";

const zGroup = z.object({
  id: z.string(),
  users: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
  }))
});

export type Group = z.TypeOf<typeof zGroup>;

const zGetGroupResponse = zGroup.merge(z.object({
  transcripts: z.array(z.object({
    transcriptId: z.string(),
    startedAt: z.date(),
    endedAt: z.date(),
    summaries: z.array(z.object({
        summaryKey: z.string(),
    }))
  })),
}));

export type GetGroupResponse = z.TypeOf<typeof zGetGroupResponse>;

const zListGroupsResponse = z.array(zGroup);
export type ListGroupsResponse = z.TypeOf<typeof zListGroupsResponse>;

const zListGroupsAndCountTranscriptsResponse = z.array(
  zGroup.merge(z.object({
  transcripts: z.array(z.object({})).optional()
})));
export type ListGroupsAndCountTranscriptsResponse = z.TypeOf<typeof zListGroupsAndCountTranscriptsResponse>;

async function listGroups(userIds: string[]) {
  const includes: Includeable[] = [{
    model: User,
    attributes: ['id', 'name']
  }, {
    model: Transcript,
    // We don't need to return any attributes, but sequelize seems to require at least one attribute.
    // TODO: Any way to return transcript count?
    attributes: ['transcriptId']
  }];

  if (userIds.length === 0) {
    return await DBGroup.findAll({ include: includes });
  } else {
    return await findGroups(userIds, 'inclusive', includes);
  }
}

const groups = router({

  create: procedure
  .use(authUser('GroupManager'))
  .input(z.object({
    userIds: z.array(z.string()).min(2),
  }))
  .mutation(async ({ input }) => {
    return await createGroup(input.userIds);
  }),

  update: procedure
  .use(authUser('GroupManager'))
  .input(zGroup)
  .mutation(async ({ input }) => {
    const newUserIds = input.users.map(u => u.id);
    checkMinimalGroupSize(newUserIds);

    await sequelizeInstance.transaction(async (t) => {
      const oldUserIds = (await GroupUser.findAll({
        where: { groupId: input.id }
      })).map(gu => gu.userId);

      for (const oldId of oldUserIds) {
        if (!newUserIds.includes(oldId)) {
          const oldGU = await GroupUser.findOne({ where: {
            groupId: input.id,
            userId: oldId,
          } });
          if (!oldGU) throw new TRPCError({
            code: 'NOT_FOUND',
            message: `分组用户 <${input.id}, ${oldId}> 不存在`
          });
          await oldGU.destroy({ transaction: t });
        }
      }

      for (const newId of newUserIds) {
        if (!oldUserIds.includes(newId)) {
          await GroupUser.create({
            groupId: input.id,
            userId: newId,
          }, { transaction: t })
        }
      }
    });
  }),

  /**
   * @returns All groups if `userIds` is empty, otherwise return groups that has all the given users.
   */
  list: procedure
  .use(authUser(['GroupManager']))
  .input(z.object({ userIds: z.string().array(), }))
  .output(zListGroupsResponse)
  .query(async ({ input }) => listGroups(input.userIds)),

  /**
   * Identical to `list`, but additionally returns empty transcripts
   */
  listAndCountTranscripts: procedure
  .use(authUser(['SummaryEngineer']))
  .input(z.object({ userIds: z.string().array(), }))
  .output(zListGroupsAndCountTranscriptsResponse)
  .query(async ({ input }) => listGroups(input.userIds)),

  get: procedure
  // We will throw access denied later if the user isn't a privileged user and isn't in the group.
  .use(authUser())
  .input(z.object({ id: z.string().uuid() }))
  .output(zGetGroupResponse)
  .query(async ({ input, ctx }) => {
    const g = await DBGroup.findByPk(input.id, {
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
      throw new TRPCError({ code: 'NOT_FOUND', message: `分组 ${input.id} 没有找到` });
    }
    if (!isPermitted(ctx.user.roles, 'SummaryEngineer') && !g.users.some(u => u.id === ctx.user.id)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `用户没有权限访问分组 ${input.id}` });
    }
    return g;
  }),
});

export default groups;

export const GROUP_ALREADY_EXISTS_ERROR_MESSAGE = '分组已经存在。';

/**
 * @returns groups that contain all the given users.
 * @param mode if `exclusive`, return the singleton group that contains no more other users.
 * @param includes Optional `include`s in the returned group.
 */
export async function findGroups(userIds: string[], mode: 'inclusive' | 'exclusive', includes?: Includeable[]):
  Promise<DBGroup[]> 
{
  invariant(userIds.length > 0);

  const gus = await GroupUser.findAll({
    where: {
      userId: userIds[0] as string,
    },
    include: [{
      model: DBGroup,
      attributes: ['id'],
      include: [{
        model: GroupUser,
        attributes: ['userId'],
      }, ...(includes || [])]
    }]
  })

  const res = gus.filter(gu => {
    const groupUserIds = gu.group.groupUsers.map(gu => gu.userId);
    const isSubset = userIds.every(uid => groupUserIds.includes(uid));
    return isSubset && (mode === 'inclusive' || userIds.length === groupUserIds.length);
  }).map(gu => gu.group);

  invariant(mode === 'inclusive' || res.length <= 1);
  return res;
}

export async function createGroup(userIds: string[]) {
  checkMinimalGroupSize(userIds);
  const existing = await findGroups(userIds, 'exclusive');
  if (existing.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: GROUP_ALREADY_EXISTS_ERROR_MESSAGE,
    });
  }

  const group = await DBGroup.create({});
  const groupUsers = await GroupUser.bulkCreate(userIds.map(userId => ({
    userId: userId,
    groupId: group.id,
  })));

  return {
    group,
    groupUsers,
  }
}

function checkMinimalGroupSize(userIds: string[]) {
  // Some userIds may be duplicates
  if ((new Set(userIds)).size < 2) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '每个分组需要至少两名用户。'
    })
  }
}
