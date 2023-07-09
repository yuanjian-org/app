/**
 * TODO: move myGroups.list to gorups.listMine, myGroups.generateMeetingLink to meetings.generateLinkForGroup.
 */
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
import { noPermissionError, notFoundError, zGroupCountingTranscripts } from "./groups";
import { encodeMeetingSubject } from "./meetings";
import { formatGroupName } from "shared/strings";
import OngoingMeetingCount from "api/database/models/OngoingMeetingCount";
import apiEnv from "api/apiEnv";

export function meetingLinkIsExpired(meetingLinkCreatedAt : Date) {
  // meeting is valid for 30 days after start time
  // check if the link is created within 30 days
  return moment() > moment(meetingLinkCreatedAt).add(30, 'days');
}

const myGroups = router({

  joinMeetingLink: procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    let meetingLink : string | null;
    let meetingId: string | null;
    const group = await Group.findByPk(input.groupId, {
      include: [GroupUser]
    });
    if (!group) throw notFoundError(input.groupId);
    // Only meeting members have access to this method.
    if (!group.groupUsers.some(gu => gu.userId === ctx.user.id)) throw noPermissionError(input.groupId);

    if (!apiEnv.hasTencentMeeting()) {
      console.log("TencentMeeting isn't configured. Fake a delay and return a mock meeting link.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return "/fakeMeeting";
    }else{

    if (group.meetingLink && !meetingLinkIsExpired(group.updatedAt)) {
      return group.meetingLink;
    }

    const now = Math.floor(Date.now() / 1000);
    const groupName = formatGroupName(group.name, group.groupUsers.length);
    const res = await createMeeting(encodeMeetingSubject(group.id, groupName), now, now + 3600);
    invariant(res.meeting_info_list.length === 1);

      meetingLink = res.meeting_info_list[0].join_url;
      meetingId = res.meeting_info_list[0].meeting_id;

      await Group.update({
        meetingLink,
        meetingId,
        meetingLinkCreatedAt: moment.unix(now).toDate(),
      }, {
        where: {
          id: group.id,
        }
      });
    }

    const ongoingMeeting = await OngoingMeetingCount.findByPk(apiEnv.TM_ADMIN_USER_ID);
    // Check if the meeting id of the ongoingMeeting matches the meeting id of the group tries to join
    // The group user will allow to join the meeting if matched
    // otherwise return null to warn that user cannot join right now due to other ongoing meetings
    if (ongoingMeeting && ongoingMeeting.count !== 0) {
      return ongoingMeeting.meetingId === meetingId ? meetingLink : null;
    }

    OngoingMeetingCount.upsert({
      TMAdminUserId: apiEnv.TM_ADMIN_USER_ID,
      count: 1,
      meetingId,
    })

    return meetingLink;
  }),

  list: procedure
  .use(authUser())
  .output(z.array(zGroupCountingTranscripts))
  .query(async ({ ctx }) => {
    return (await GroupUser.findAll({
      where: { userId: ctx.user.id },
      include: [{
        model: Group,
        include: [User, Transcript]
      }]
    }))
      .map(groupUser => groupUser.group)
  }),
});

export default myGroups;
