import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import Group from "../database/models/Group";
import GroupUser from "../database/models/GroupUser";
import { Includeable } from "sequelize";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import Transcript from "../database/models/Transcript";
import Summary from "../database/models/Summary";
import invariant from "tiny-invariant";
import _ from "lodash";
import { isPermitted } from "../../shared/Role";

const zGroup = z.object({
  id: z.string(),
  users: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
  }))
});

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
    return await Group.findAll({ include: includes });
  } else {
    const group = await findGroup(userIds, includes);
    return group == null ? [] : [group];
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

  /**
   * @returns All groups if `userIds` is empty, otherwise return the group that contains all the given users and no more.
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
    }
    if (!isPermitted(ctx.user.roles, 'SummaryEngineer') && !g.users.some(u => u.id === ctx.user.id)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `User has no access to Group ${input.id}` });
    }
    return g;
  }),
});

export default groups;

export const GROUP_ALREADY_EXISTS_ERROR_MESSAGE = 'Group already exists.';

/**
 * @returns The group that contains all the given users and no more, or null if no such group is found.
 * @param includes Optional `include`s in the returned group.
 */
export async function findGroup(userIds: string[], includes?: Includeable[]): Promise<Group | null> {
  invariant(userIds.length > 0);

  const gus = await GroupUser.findAll({
    where: {
      userId: userIds[0] as string,
    },
    include: [{
      model: Group,
      attributes: ['id'],
      include: [{
        model: GroupUser,
        attributes: ['userId'],
      }, ...(includes || [])]
    }]
  })

  for (const gu of gus) {
    const set1 = new Set(gu.group.groupUsers.map(gu => gu.userId));
    const set2 = new Set(userIds);
    if (_.isEqual(set1, set2)) return gu.group;
  }
  return null;
}


export async function createGroup(userIds: string[]) {
  const existing = await findGroup(userIds);
  if (existing) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: GROUP_ALREADY_EXISTS_ERROR_MESSAGE,
    });
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
