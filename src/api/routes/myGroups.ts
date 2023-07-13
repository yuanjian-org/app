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
import { createMeeting, listSelectedMeeting } from "../TencentMeeting";
import Transcript from "../database/models/Transcript";
import moment from 'moment';
import { noPermissionError, notFoundError, zGroupCountingTranscripts } from "./groups";
import { encodeMeetingSubject } from "./meetings";
import { formatGroupName } from "shared/strings";
import OngoingMeetings from "api/database/models/OngoingMeetings";
import apiEnv from "api/apiEnv";

// check if a "MEETING_STATE_READY" meeting is started 
// if not drop/destory the meeting
export async function meetingLinkIsStarted(meetingId: string) {
  const selectedMeeting = await OngoingMeetings.findOne({ where: { meetingId } });
  if (selectedMeeting && (await listSelectedMeeting(meetingId, selectedMeeting.tmUserId)).meeting_info_list[0].status !== 'MEETING_STATE_START') {
    OngoingMeetings.destroy({ where: { meetingId } })
  }
}

const myGroups = router({
  /**
   * This api will join meeting if this meeting is presented in OngoingMeetings model
   * If not presented, it will create a new meeting with available TM user Ids
   * then insert in OngoingMeetings
   * @function meetingLinkIsStarted verifies if User has joined a link
   * If a newly generatedly link has not been joined for 10 min,
   * this function will destory this meeting from OngoingMeetings
   * @returns {meetingLink} returns a valid tencent meeting link
   * Otherwise, return null which will trigger a conccurent meeting warning
   */
  joinMeeting: procedure
    .use(authUser())
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
      }

      // if the user's group is present in OngoingMeetings Model, return the meeting link 
      const ongoingMeeting = await OngoingMeetings.findOne({ where: { groupId: group.id } });
      if (ongoingMeeting) {
        return ongoingMeeting.meetingLink;
      }
      // if not shown in OngoingMeetings, check if there are empty slots to join
      // find TM user ids that are not in use and generate a meeting link using an available id
      const TM_USER_IDS = apiEnv.TM_ADMIN_USER_ID.split(',');
      const meetings = await OngoingMeetings.findAll();
      if (meetings.length >= TM_USER_IDS.length) { return null; };
      // find and filter vacant ids
      const availableTmUserIds = TM_USER_IDS.filter(uid => !meetings.some(m => m.tmUserId === uid));
      invariant(availableTmUserIds.length > 0);
      // generate link
      const now = Math.floor(Date.now() / 1000);
      const groupName = formatGroupName(group.name, group.groupUsers.length);
      const res = await createMeeting(availableTmUserIds[0], encodeMeetingSubject(group.id, groupName), now, now + 3600);
      invariant(res.meeting_info_list.length === 1);
      const meetingId = res.meeting_info_list[0].meeting_id;
      const meetingLink = res.meeting_info_list[0].join_url;

      await OngoingMeetings.upsert({
        groupId: group.id,
        tmUserId: availableTmUserIds[0],
        status: 'MEETING_STATE_READY',
        meetingId,
        meetingLink,
      });

      // Check if the group meeting started after 10 min
      setTimeout(() => { meetingLinkIsStarted(meetingId) }, 600000);

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
