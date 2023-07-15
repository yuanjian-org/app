import invariant from 'tiny-invariant';
import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import DbGroup from "../database/models/Group";
import { createMeeting, getMeeting } from "../TencentMeeting";
import { formatGroupName } from "shared/strings";
import OngoingMeetings from "api/database/models/OngoingMeetings";
import apiEnv from "api/apiEnv";
import sleep from "../../shared/sleep";
import { noPermissionError, notFoundError } from "api/errors";

/**
* Find the group meeting by the input group id.
* If this meeting is presented in OngoingMeetings model, return and join.
* If not presented, it will create a new meeting with available TM user Ids then insert it into OngoingMeetings.
* @returns a valid tencent meeting link or null which will trigger a conccurent meeting warning.
*/
const join = procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx, input }) => 
{
  const group = await db.Group.findByPk(input.groupId, {
    include: [db.GroupUser]
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
  
  updateOngoingMeetings();

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
});

const meetings = router({
  join,
});
export default meetings;


const meetingSubjectseparator = ' | ';

export function encodeMeetingSubject(groupId: string, description: string): string {
  invariant(z.string().uuid().safeParse(groupId).success);
  return description + meetingSubjectseparator + groupId;
}

/**
 * @returns Group Id or `null` if the decoded Group Id isn't a valid UUID stirng.
 */
export function safeDecodeMeetingSubject(subject: string): string | null {
  const parts = subject.split(meetingSubjectseparator);
  invariant(parts.length > 0);
  // Some legacy meeting IDs don't have the description part.
  const parsed = z.string().uuid().safeParse(parts.length == 2 ? parts[1] : subject);
  return parsed.success ? parsed.data : null;
}

async function generateMeeting(group: DbGroup, availableTmUserId: string) {
  const now = Math.floor(Date.now() / 1000);
  const groupName = formatGroupName(group.name, group.groupUsers.length);
  const res = await createMeeting(availableTmUserId, encodeMeetingSubject(group.id, groupName), now, now + 3600);
  invariant(res.meeting_info_list.length === 1);
  return {
    meetingId: res.meeting_info_list[0].meeting_id,
    meetingLink: res.meeting_info_list[0].join_url
  };
}

export async function updateOngoingMeetings() {
  const ongoingMeetings = await OngoingMeetings.findAll({ attributes: ["tmUserId", "meetingId"] });
  for (const meeting of ongoingMeetings) {
    if ((await getMeeting(meeting.meetingId, meeting.tmUserId)).status !== 'MEETING_STATE_STARTED') {
      await OngoingMeetings.destroy({ where: { tmUserId: meeting.tmUserId } });
    }
  }
}
