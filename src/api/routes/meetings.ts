import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { getMeeting } from "../TencentMeeting";
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
import { Op, Transaction } from 'sequelize';
import moment from 'moment';

export const gracePeriodMinutes = 1;

/**
 * Find the group meeting by the input group id. If the meeting is presented in
 * MeetingSlot model, return the corresponding meeting link. Otherwise, if there
 * are free meeting slots, use one slot or otherwise return null to trigger a
 * conccurent meeting warning in the frontend.
 */
const join = procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx: { user, baseUrl }, input: { groupId } }) => 
{
  const g = await db.Group.findByPk(groupId, { 
    attributes: groupAttributes,
    include: groupInclude,
  });
  if (!g) throw notFoundError("分组", groupId);

  checkPermissionForGroup(user, g);

  if (!apiEnv.hasTencentMeeting()) {
    await sleep(2000);
    return "/fake-meeting";
  }

  // Lock option is applied to transactions in order to prevent conflicts when
  // multiple transactions are trying to access or modify the same data
  // simultaneously: https://stackoverflow.com/a/48297781
  // If the group is already present in MeetingSlot, return the meeting link.
  return await sequelize.transaction(async transaction => {
    // Find an existing slot for the group. The slot's status is ignored.
    // It means that even if the meeting is already ended, it will still be
    // reused for the group.
    const existing = await db.MeetingSlot.findOne({ 
      where: { groupId },
      lock: true,
      transaction,
    });
    if (existing) return existing.meetingLink;

    let refreshed = false;
    while (true) {
      const free = await db.MeetingSlot.findOne({
        where: { groupId: null },
        attributes: ["id", "meetingId", "meetingLink"],
        lock: true,
        transaction,
      });
      
      if (free) {
        await free.update({ groupId }, { transaction });
        await db.MeetingHistory.create({
          meetingId: free.meetingId,
          groupId,
          startTime: currentTimestamp(),
        }, { transaction });    
        return free.meetingLink;

      } else {
        if (!refreshed) {
          // No slots available. Refresh them and try again.
          await refreshMeetingSlots(transaction);
          refreshed = true;
          continue;
        } else {
          emailRoleIgnoreError("SystemAlertSubscriber", "超过并发会议上限", 
            `发起会议的分组：${baseUrl}/groups/${groupId}`, baseUrl);
          return null;
        }
      }
    }
  });
});

function currentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

export default router({
  join,
});

// async function create(g: Group, tmUserId: string) {
//   const groupName = formatGroupName(g.name, g.users.length);
//   const subject = encodeMeetingSubject(g.id, groupName);
//   const now = Math.floor(Date.now() / 1000);
//   const res = await createMeeting(tmUserId, subject, now, now + 3600);
//   invariant(res.meeting_info_list.length === 1);
//   return {
//     meetingId: res.meeting_info_list[0].meeting_id,
//     meetingLink: res.meeting_info_list[0].join_url,
//   };
// }

export async function refreshMeetingSlots(transaction: Transaction) {
  const slots = await db.MeetingSlot.findAll({
    where: { groupId: { [Op.ne]: null } },
    attributes: ["id", "tmUserId", "meetingId", "updatedAt"],
    lock: true,
    transaction,
  });
  for (const slot of slots) {
    /**
     * Assume the meeting is ongoing if it is created not long time ago.
     * 
     * This is added to support the corner case after a user creates a meeting 
     * and before joining while the user's browser is loading TencentMeeting's
     * meeting page. If another group attempts to start a meeting in this period,
     * the slot would be deemed available because the meeting's status in
     * TencentMeeting's backend hasn't been updated.
     */
    if (moment().diff(slot.updatedAt, 'minutes') < gracePeriodMinutes) continue;
    const m = await getMeeting(slot.meetingId, slot.tmUserId);

    if (m.status !== 'MEETING_STATE_STARTED') {
      await slot.update({ groupId: null }, { transaction });
    }
  }
}
