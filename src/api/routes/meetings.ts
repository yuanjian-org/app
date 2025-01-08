import invariant from 'tiny-invariant';
import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { createMeeting, getMeeting } from "../TencentMeeting";
import { formatGroupName } from "shared/strings";
import apiEnv from "api/apiEnv";
import sleep from "../../shared/sleep";
import { notFoundError } from "api/errors";
import { emailRoleIgnoreError } from 'api/sendgrid';
import sequelize from 'api/database/sequelize';
import { checkPermissionForGroup } from './groups';
import {
  groupAttributes,
  groupInclude
} from 'api/database/models/attributesAndIncludes';
import { Group } from '../../shared/Group';
import moment from 'moment';

/**
 * Find the group meeting by the input group id. If the meeting is presented in
 * OngoingMeetings model, return the existing meeting link. Otherwise, if there
 * is still meeting quota, create a new meeting with an available TM user Id
 * and return the new meeting link. If there is no more available quota,
 * return null to trigger a conccurent meeting warning.
 */
const join = procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx, input }) => 
{
  const g = await db.Group.findByPk(input.groupId, { 
    attributes: groupAttributes,
    include: groupInclude,
  });
  if (!g) throw notFoundError("分组", input.groupId);

  checkPermissionForGroup(ctx.user, g);

  if (!apiEnv.hasTencentMeeting()) {
    await sleep(2000);
    return "/fake-meeting";
  }

  await updateOngoingMeetings();

  // Lock option is applied to transactions in order to prevent conflicts when
  // multiple transactions are trying to access or modify the same data
  // simultaneously. Details: https://stackoverflow.com/a/48297781
  // If the user's group is present in OngoingMeetings Model, return the
  // meeting link.
  return await sequelize.transaction(async transaction => {
    const ongoingMeeting = await db.OngoingMeetings.findOne({ 
      where: { groupId: g.id },
      lock: true,
      transaction,
    });
    if (ongoingMeeting) {
      return ongoingMeeting.meetingLink;
    }

    // if not in OngoingMeetings, check if there are empty slots to use. Find a
    // TM user id that is not in use and generate a meeting link using this
    // user id.
    const meetings = await db.OngoingMeetings.findAll({
      attributes: ["tmUserId"],
      lock: true,
      transaction,
    });
    if (meetings.length >= apiEnv.TM_USER_IDS.length) {
      emailRoleIgnoreError("SystemAlertSubscriber", "超过并发会议上限", 
        `上限：${apiEnv.TM_USER_IDS.length}。` +
        `发起会议的分组：${ctx.baseUrl}/groups/${input.groupId}`,
        ctx.baseUrl);
      return null;
    }

    // find and filter vacant ids
    const availableTmUserIds = apiEnv.TM_USER_IDS.filter(uid =>
      !meetings.some(m => m.tmUserId === uid));
    invariant(availableTmUserIds.length > 0);
    const { meetingId, meetingLink } = await create(g, availableTmUserIds[0]);

    await db.OngoingMeetings.create({
      groupId: g.id,
      tmUserId: availableTmUserIds[0],
      meetingId,
      meetingLink,
    }, { transaction });

    return meetingLink;
  });
});

export default router({
  join,
});

const subjectSep = ' | ';

/**
 * Meeting subject format: "<description> | <group_id>"
 * 
 * Only the group id is used by the system. Description is only for human
 * readability.
 */
export function encodeMeetingSubject(groupId: string, description: string) {
  invariant(z.string().uuid().safeParse(groupId).success);
  return description + subjectSep + groupId;
}

/**
 * @returns Group Id or `null` if the decoded Group Id isn't a valid UUID stirng.
 */
export function safeDecodeMeetingSubject(subject: string): string | null {
  const parts = subject.split(subjectSep);
  if (parts.length < 2) return null;
  const parsed = z.string().uuid().safeParse(parts[1]);
  return parsed.success ? parsed.data : null;
}

async function create(g: Group, tmUserId: string) {
  const groupName = formatGroupName(g.name, g.users.length);
  const subject = encodeMeetingSubject(g.id, groupName);
  const now = Math.floor(Date.now() / 1000);
  const res = await createMeeting(tmUserId, subject, now, now + 3600);
  invariant(res.meeting_info_list.length === 1);
  return {
    meetingId: res.meeting_info_list[0].meeting_id,
    meetingLink: res.meeting_info_list[0].join_url,
  };
}

export async function updateOngoingMeetings() {
  await sequelize.transaction(async transaction => {
    const ongoingMeetings = await db.OngoingMeetings.findAll({
      attributes: ["tmUserId", "meetingId", "createdAt"],
      lock: true,
      transaction,
    });
    for (const meeting of ongoingMeetings) {
      /**
       * This condition is added to improve the corner case when a user created
       * a meeting but did not join. If the user did not join meeting right away,
       * other users of the same group might create a new meeting and overwrite
       * the link. A 3-min grace period is added after a meeting is created to
       * prevent such case.
       */
      if (moment().diff(meeting.createdAt, 'minutes') < 3) continue;

      const meetingInfo = await getMeeting(meeting.meetingId, meeting.tmUserId);
      if (meetingInfo.status !== 'MEETING_STATE_STARTED') {
        await db.OngoingMeetings.destroy({
          where: { tmUserId: meeting.tmUserId },
          transaction,
        });
      }
    }
  });
}
