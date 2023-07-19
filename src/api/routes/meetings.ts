import invariant from 'tiny-invariant';
import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import DbGroup from "../database/models/Group";
import { createMeeting, getMeeting } from "../TencentMeeting";
import { formatGroupName } from "shared/strings";
import apiEnv from "api/apiEnv";
import sleep from "../../shared/sleep";
import { noPermissionError, notFoundError } from "api/errors";
import { emailRoleIgnoreError } from 'api/sendgrid';
import sequelizeInstance from 'api/database/sequelizeInstance';

/**
 * Find the group meeting by the input group id. If the meeting is presented in OngoingMeetings model, return the
 * existing meeting link. Otherwise, if there is still meeting quota, create a new meeting with an available TM user Id
 * and return the new meeting link. If there is no more available quota, return null to trigger a conccurent meeting 
 * warning.
 */
const join = procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx, input }) => 
{
  const group = await db.Group.findByPk(input.groupId, { include: [db.GroupUser] });
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

  // lock option is applied to transactions in order to prevent conflicts 
  // when multiple transactions are trying to access or modify the same data simultaneously
  // details: https://stackoverflow.com/a/48297781
  // if the user's group is present in OngoingMeetings Model, return the meeting link 
  return await sequelizeInstance.transaction(async (t) => {
    const ongoingMeeting = await db.OngoingMeetings.findOne({ 
      where: { groupId: group.id },
      lock: true, transaction: t,
    });
    if (ongoingMeeting) {
      return ongoingMeeting.meetingLink;
    }

    // if not in OngoingMeetings, check if there are empty slots to use. Find a TM user id that is not in use and
    // generate a meeting link using this user id.
    const meetings = await db.OngoingMeetings.findAll({ attributes: ["tmUserId"], lock: true, transaction: t });
    if (meetings.length >= apiEnv.TM_USER_IDS.length) {
      await emailRoleIgnoreError("SystemAlertSubscriber", "超过并发会议上限", 
        `上限：${apiEnv.TM_USER_IDS.length}。发起会议的分组：${ctx.baseUrl}/groups/${input.groupId}`, ctx.baseUrl);
      return null;
    }

    // find and filter vacant ids
    const availableTmUserIds = apiEnv.TM_USER_IDS.filter(uid => !meetings.some(m => m.tmUserId === uid));
    invariant(availableTmUserIds.length > 0);
    const { meetingId, meetingLink } = await create(group, availableTmUserIds[0]);

    await db.OngoingMeetings.create({
      groupId: group.id,
      tmUserId: availableTmUserIds[0],
      meetingId,
      meetingLink,
    }, { transaction: t });

    return meetingLink;
  });
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

async function create(group: DbGroup, availableTmUserId: string) {
  const now = Math.floor(Date.now() / 1000);
  const groupName = formatGroupName(group.name, group.groupUsers.length);
  const res = await createMeeting(availableTmUserId, encodeMeetingSubject(group.id, groupName), now, now + 3600);
  invariant(res.meeting_info_list.length === 1);
  return {
    meetingId: res.meeting_info_list[0].meeting_id,
    meetingLink: res.meeting_info_list[0].join_url,
  };
}

export async function updateOngoingMeetings() {
  await sequelizeInstance.transaction(async (t) => {
    const ongoingMeetings = await db.OngoingMeetings.findAll({
      attributes: ["tmUserId", "meetingId"], lock: true, transaction: t,
    });
    for (const meeting of ongoingMeetings) {
      const meetingInfo = await getMeeting(meeting.meetingId, meeting.tmUserId);
      if (meetingInfo.status !== 'MEETING_STATE_STARTED') {
        await db.OngoingMeetings.destroy({ where: { tmUserId: meeting.tmUserId }, transaction: t });
      }
    }
  });
}
