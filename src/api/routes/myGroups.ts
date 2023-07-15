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
import { zGroupCountingTranscripts } from "../../shared/Group";
import { encodeMeetingSubject } from "./meetings";
import { formatGroupName } from "shared/strings";
import OngoingMeetings from "api/database/models/OngoingMeetings";
import apiEnv from "api/apiEnv";
import sleep from "../../shared/sleep";
import { noPermissionError, notFoundError } from "api/errors";

async function generateMeeting(group: Group, availableTmUserId: string) {
  const now = Math.floor(Date.now() / 1000);
  const groupName = formatGroupName(group.name, group.groupUsers.length);
  const res = await createMeeting(availableTmUserId, encodeMeetingSubject(group.id, groupName), now, now + 3600);
  invariant(res.meeting_info_list.length === 1);
  return {
    meetingId: res.meeting_info_list[0].meeting_id,
    meetingLink: res.meeting_info_list[0].join_url
  };
}

const myGroups = router({
  /**
  * joinMeeting function will find the group meeting by the input group id
  * If this meeting is presented in OngoingMeetings model, return and join
  * If not presented, it will create a new meeting with available TM user Ids
  * then insert it in OngoingMeetings
  * @returns a valid tencent meeting link
  * Otherwise, return null which will trigger a conccurent meeting warning
  */
  joinMeeting: procedure
    .use(authUser())
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await Group.findByPk(input.groupId, {
        include: [GroupUser]
      });
      if (!group) throw notFoundError("分组", input.groupId);
      // Only meeting members have access to this method.
      if (!group.groupUsers.some(gu => gu.userId === ctx.user.id)) {
        throw noPermissionError("分组", input.groupId);
      }

      if (!apiEnv.hasTencentMeeting()) {
        console.log("TencentMeeting isn't configured. Fake a delay and return a mock meeting link.");
        await sleep(2000);
        return "/fakeMeeting";
      }

      // TODO: implement a lock option to the find query, details: https://stackoverflow.com/a/48297781
      // if the user's group is present in OngoingMeetings Model, return the meeting link 
      const ongoingMeeting = await OngoingMeetings.findOne({ where: { groupId: group.id } });
      if (ongoingMeeting) {
        return ongoingMeeting.meetingLink;
      }
      // if not shown in OngoingMeetings, check if there are empty slots to join
      // find TM user ids that are not in use and generate a meeting link using an available id
      const meetings = await OngoingMeetings.findAll({ attributes: ["tmUserId"] });
      if (meetings.length >= apiEnv.TM_USER_IDS.length) { return null; };
      // find and filter vacant ids
      const availableTmUserIds = apiEnv.TM_USER_IDS.filter(uid => !meetings.some(m => m.tmUserId === uid));
      invariant(availableTmUserIds.length > 0);
      const { meetingId, meetingLink } = await generateMeeting(group, availableTmUserIds[0]);

      await OngoingMeetings.create({
        groupId: group.id,
        tmUserId: availableTmUserIds[0],
        meetingId,
        meetingLink,
      });

      return meetingLink;
    }),

  /**
   * Unowned groups are the ones not assoicated with a partnership.
   */
  listUnowned: procedure
  .use(authUser())
  .output(z.array(zGroupCountingTranscripts))
  .query(async ({ ctx }) => {
    return (await GroupUser.findAll({
      where: { 
        userId: ctx.user.id,
      },
      include: [{
        model: Group,
        include: [User, Transcript],
        where: {
          partnershipId: null,
        }
      }]
    }))
      .map(groupUser => groupUser.group)
  }),
});

export default myGroups;
