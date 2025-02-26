import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { createMeeting, getMeeting } from "../TencentMeeting";
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
import invariant from "shared/invariant";
import { downloadSummaries } from "./summaries";

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

export default router({
  join,
});

export async function refreshMeetingSlots(transaction: Transaction) {
  const slots = await db.MeetingSlot.findAll({
    where: { groupId: { [Op.ne]: null } },
    attributes: ["id", "tmUserId", "meetingId", "updatedAt", "groupId"],
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

    // Meeting is ongoing. Skip.
    if (m.status == 'MEETING_STATE_STARTED') continue;

    console.log(`Marking meeting ${slot.meetingId} as ended for group
      ${slot.groupId}`);

    const histories = await db.MeetingHistory.findAll({
      where: { 
        meetingId: slot.meetingId,
        endedBefore: null,
      },
      transaction,
    });

    /**
     * MeetingSlot and MeetingHistory should be consistent in that an
     * occupied MeetingSlot must has a corresponding MeetingHistory entry
     * with a null endedBefore.
     */
    invariant(histories.length === 1, `more than one history with null
      endedBefore found for ${slot.meetingId}`);
    invariant(histories[0].groupId === slot.groupId, `group id mismatch for 
      history ${slot.meetingId}: ${histories[0].groupId} != ${slot.groupId}`);

    await histories[0].update({ endedBefore: new Date() }, { transaction });
    await slot.update({ groupId: null }, { transaction });
  }
}

export async function syncMeetings() {
  /**
   * Refresh meeting slots *before* downloading summaries because the latter
   * only looks at MeetingHistory entries with `endedBefore` already set for
   * simplicity. The former makes sure this field is set for all the meetings
   * that have ended.
   */
  await sequelize.transaction(async transaction => {
    await refreshMeetingSlots(transaction);
    await recycleMeetings(transaction);
  });

  await downloadSummaries();
}

/**
 * Starting mid-2024, Tencent Meeting imposed a new restriction that limits the
 * number of meetings created each month to two per paying user:
 * https://cloud.tencent.com/document/product/1095/42417 Therefore, we can't
 * create new meetings on every meeting request. Instead, we reuse existing 
 * meeting links and use this function to periodically attempt to create new
 * meetings and replace existing ones.
 * 
 * This "recycling" process is necessary because:
 * 
 * 1) a meeting becomes unuseable after a while (e.g. one month for one-off
 * meetings), and 2) we want to minimize the reuse of meeting links so that
 * if someone remembers a meeting link and use it outside of our system,
 * either accidentally or intentionally, the chance that they join an ongoing
 * meeting of another group is low.
 */
async function recycleMeetings(transaction: Transaction) {
  for (const tmUserId of apiEnv.TM_USER_IDS) {
    const slot = await db.MeetingSlot.findOne({
      where: { tmUserId },
      attributes: ["id", "groupId"],
      lock: true,
      transaction,
    });

    // Skip ongoing meetings.
    if (slot && slot.groupId) continue;

    try {
      const { meetingId, meetingLink } = await create(tmUserId);
      console.log(`Meeting created for user ${tmUserId}: ` +
        `${meetingId}, ${meetingLink}`);

      if (slot) {
        await slot.update({ 
          meetingId, meetingLink,
        }, { transaction });
      } else {
        await db.MeetingSlot.create({
          tmUserId, meetingId, meetingLink,
        }, { transaction });
      }

    } catch (e) {
      console.error(`(Expected) meeting creation failure for user ${tmUserId}:
        ${e}`);
    }
  }
}

async function create(tmUserId: string) {
  const now = Math.floor(Date.now() / 1000);
  const res = await createMeeting(tmUserId, "导师平台会议", now, now + 3600);
  invariant(res.meeting_info_list.length === 1,
    `meeting_info_list.length != 1: ${JSON.stringify(res)}`);

  return {
    meetingId: res.meeting_info_list[0].meeting_id,
    meetingLink: res.meeting_info_list[0].join_url,
  };
}
