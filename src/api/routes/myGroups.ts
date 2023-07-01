import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import GroupUser from "../database/models/GroupUser";
import Group from "../database/models/Group";
import User from "../database/models/User";
import invariant from "tiny-invariant";
import { createMeeting } from "../TencentMeeting";
import Transcript from "../database/models/Transcript";
import moment from 'moment';
import OngoingMeetingCount from "api/database/models/OngoingMeetingCount";
import apiEnv from "api/apiEnv";

function isSubset<T>(superset: Set<T>, subset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}

export function meetingLinkIsExpired(meetingLinkCreatedAt : Date) {
  // meeting is valid for 31 days after start time
  // check if the link is created within 30 days
  return moment() > moment(meetingLinkCreatedAt).add(30, 'days');
}

const myGroups = router({

  /**
   * TODO: Only allow group users to call this function.
   */
  joinMeeting: procedure
    .use(authUser())
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      const group = await Group.findByPk(input.groupId);
      invariant(group);

    if (group.meetingLink && !meetingLinkIsExpired(group.updatedAt)) {
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

  list: procedure
    .use(authUser())
    .output(
      z.array(z.object({
        id: z.string(),
        transcripts: z.array(z.object({
          // The UI that calls this API only need a transcript count so no fields need to be returned.
        })),
        users: z.array(z.object({
          id: z.string(),
          name: z.string().nullable(),
        }))
      })).optional()
    ).query(async ({ ctx }) => {
      return (await GroupUser.findAll({
        where: { userId: ctx.user.id },
        include: [{
          model: Group,
          include: [User, Transcript]
        }]
      }))
        .map(groupUser => groupUser.group)
    }),

  countOngoingMeeting: procedure.use(authUser()).query(async () => {
    // change later if multiple TM admin user ids are used
    return (await OngoingMeetingCount.findByPk(apiEnv.TM_ADMIN_USER_ID))?.count
  }),

});

export default myGroups;
