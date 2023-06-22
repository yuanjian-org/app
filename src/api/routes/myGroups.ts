import { procedure, router } from "../tServer";
import { z } from "zod";
import { authUser } from "../auth";
import GroupUser from "../database/models/GroupUser";
import { Op } from "sequelize";
import Group from "../database/models/Group";
import User from "../database/models/User";
import PublicUser from "../../shared/publicModels/PublicUser";
import { presentPublicGroup } from "../../shared/publicModels/PublicGroup";
import invariant from "tiny-invariant";
import { createMeeting } from "../tencentMeeting";

function isSubset<T>(superset: Set<T>, subset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}

const myGroups = router({
  generateMeetingLink: procedure.use(
    authUser('my-groups:write')
  ).input(z.object({
    groupId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const group = await Group.findByPk(input.groupId);
    invariant(group);

    if (group.meetingLink) {
      return group.meetingLink;
    }

    const now = Math.floor(Date.now() / 1000);
    const res = await createMeeting(group.id, now, now + 3600);
    invariant(res.meeting_info_list.length === 1);

    const meetingLink = res.meeting_info_list[0].join_url;

    await Group.update({
      meetingLink,
    }, {
      where: {
        id: group.id,
      }
    });

    return meetingLink;
  }),

  list: procedure.use(
    authUser('my-groups:read')
  ).input(z.object({
  })).query(async ({ input, ctx }) => {

    // TODO: use a single JOIN query to return <meeting_id, user_name> tuples directly from DB.

    const groupUserList = await GroupUser.findAll({
      where: {
        userId: ctx.user.id
      },
    });

    const userIdSet = new Set([ctx.user.id]);

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

export default myGroups;
