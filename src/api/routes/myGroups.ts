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
import { zGroupCountingTranscripts } from "./groups";
import { encodeMeetingSubject } from "./meetings";
import { formatGroupName } from "../../shared/strings";
import apiEnv from "../apiEnv";
import sleep from "../../shared/sleep";
import { noPermissionError, notFoundError } from "api/errors";

export function meetingLinkIsExpired(meetingLinkCreatedAt : Date) {
  // meeting is valid for 31 days after start time
  // check if the link is created within 30 days
  return moment() > moment(meetingLinkCreatedAt).add(30, 'days');
}

const myGroups = router({

  generateMeetingLink: procedure
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

    if (group.meetingLink && !meetingLinkIsExpired(group.updatedAt)) {
      return group.meetingLink;
    }

    const now = Math.floor(Date.now() / 1000);
    const groupName = formatGroupName(group.name, group.groupUsers.length);
    const res = await createMeeting(encodeMeetingSubject(group.id, groupName), now, now + 3600);
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
