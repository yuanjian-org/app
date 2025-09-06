import { procedure, router } from "../trpc";
import { z } from "zod";
import { authUser } from "../auth";
import db from "../database/db";
import { createRecurringMeeting, getMeeting } from "../TencentMeeting";
import apiEnv from "api/apiEnv";
import sleep from "../../shared/sleep";
import { notFoundError } from "api/errors";
import { emailRole, emailRoleIgnoreError } from "api/email";
import sequelize from "api/database/sequelize";
import { checkPermissionForGroup } from "./groups";
import {
  groupAttributes,
  groupInclude,
} from "api/database/models/attributesAndIncludes";
import { Op, Transaction } from "sequelize";
import moment from "moment";
import invariant from "shared/invariant";
import { downloadSummaries } from "./summaries";
import { formatUserName } from "shared/strings";
import getBaseUrl from "shared/getBaseUrl";

export const gracePeriodMinutes = 5;

/**
 * Find the group meeting by the input group id. If the meeting is presented in
 * MeetingSlot model, return the corresponding meeting link. Otherwise, if there
 * are free meeting slots, use one slot or otherwise return null to trigger a
 * conccurent meeting warning in the frontend.
 */
const join = procedure
  .use(authUser())
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ ctx: { me, baseUrl }, input: { groupId } }) => {
    const g = await db.Group.findByPk(groupId, {
      attributes: groupAttributes,
      include: groupInclude,
    });
    if (!g) throw notFoundError("分组", groupId);

    checkPermissionForGroup(me, g);

    if (!apiEnv.hasTencentMeeting()) {
      await sleep(2000);
      return "/fake-meeting";
    }

    // Lock option is applied to transactions in order to prevent conflicts when
    // multiple transactions are trying to access or modify the same data
    // simultaneously: https://stackoverflow.com/a/48297781
    // If the group is already present in MeetingSlot, return the meeting link.
    return await sequelize.transaction(async (transaction) => {
      // Find an existing slot for the group. TencentMeeting's status is ignored.
      // It means that even if the meeting is ended, it will still be reused for
      // the group.
      const existing = await db.MeetingSlot.findOne({
        where: { groupId },
        lock: true,
        transaction,
      });
      if (existing) return existing.meetingLink;

      // No matching slot found. Find a free slot.
      let refreshed = false;
      while (true) {
        const free = await db.MeetingSlot.findOne({
          where: { groupId: null },
          // To ease troubleshooting, always pick the smallest available tmUserId.
          order: [["tmUserId", "ASC"]],
          attributes: ["id", "meetingId", "meetingLink"],
          lock: true,
          transaction,
        });

        if (free) {
          await free.update({ groupId }, { transaction });
          await db.MeetingHistory.create(
            {
              meetingId: free.meetingId,
              groupId,
            },
            { transaction },
          );
          return free.meetingLink;
        } else {
          if (!refreshed) {
            // No slots available. Refresh them and try again.
            await refreshMeetingSlots(transaction);
            refreshed = true;
            continue;
          } else {
            const slots = await db.MeetingSlot.findAll({
              attributes: ["groupId"],
              transaction,
            });
            const content =
              `试图发起会议的分组：${baseUrl}/groups/${groupId}。
            会议进行中的分组：` +
              slots.map((s) => `${baseUrl}/groups/${s.groupId}`).join("、");

            emailRoleIgnoreError(
              "SystemAlertSubscriber",
              "超过并发会议上限",
              content,
              baseUrl,
            );
            return null;
          }
        }
      }
    });
  });

/**
 * Decline the meeting feature.
 */
const decline = procedure
  .use(authUser())
  .mutation(async ({ ctx: { me, baseUrl } }) => {
    await emailRole(
      "MentorshipManager",
      "用户拒绝使用会议功能",
      `${formatUserName(me.name)}（用户ID: ${me.id}）拒绝使用会议功能。请与其取得联系，
    商量解决方案。`,
      baseUrl,
    );
  });

export default router({
  join,
  decline,
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
     * This is added to support the corner case after a user clicked the join
     * button and before actually joining TencentMeeting. Without this check,
     * if another group attempts to start a meeting in this period, the slot
     * would be incorrectly marked as available because TencentMeeting's backend
     * hasn't updated the meeting status yet.
     */
    if (moment().diff(slot.updatedAt, "minutes") < gracePeriodMinutes) continue;
    const m = await getMeeting(slot.meetingId, slot.tmUserId);

    // Meeting is ongoing. Skip.
    if (m.status == "MEETING_STATE_STARTED") continue;

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
    invariant(
      histories.length === 1,
      `more than one history with null
      endedBefore found for ${slot.meetingId}`,
    );
    invariant(
      histories[0].groupId === slot.groupId,
      `group id mismatch for 
      history ${slot.meetingId}: ${histories[0].groupId} != ${slot.groupId}`,
    );

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
  await sequelize.transaction(async (transaction) => {
    await refreshMeetingSlots(transaction);
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
 * meeting of another group or are exposed to previous meeting chat messages is
 * low.
 */
export async function recycleMeetings() {
  for (const tmUserId of apiEnv.TM_USER_IDS) {
    await sequelize.transaction(async (transaction) => {
      const slot = await db.MeetingSlot.findOne({
        where: { tmUserId },
        attributes: ["id", "groupId"],
        lock: true,
        transaction,
      });

      // Skip ongoing meetings.
      if (slot && slot.groupId) return;

      try {
        const { meetingId, meetingLink } = await create(tmUserId);
        console.log(
          `Meeting created for user ${tmUserId}: ` +
            `${meetingId}, ${meetingLink}`,
        );

        if (slot) {
          await slot.update(
            {
              meetingId,
              meetingLink,
            },
            { transaction },
          );
        } else {
          await db.MeetingSlot.create(
            {
              tmUserId,
              meetingId,
              meetingLink,
            },
            { transaction },
          );
        }
      } catch (e) {
        console.error(`(Expected) meeting creation failure for user ${tmUserId}:
          ${e}`);
      }
    });
  }
}

async function create(tmUserId: string) {
  const now = Math.floor(Date.now() / 1000);
  const nextHour = Math.ceil(now / 3600) * 3600;

  try {
    const res = await createRecurringMeeting(
      tmUserId,
      "请勿分享或保存会议链接，请通过 mentors.org.cn 进入会议",
      nextHour,
      nextHour + 3600,
    );

    invariant(
      res.meeting_info_list.length >= 1,
      `meeting_info_list.length < 1: ${JSON.stringify(res)}`,
    );
    const meetingId = res.meeting_info_list[0].meeting_id;
    const meetingLink = res.meeting_info_list[0].join_url;

    await db.EventLog.create({
      data: {
        type: "MeetingCreation",
        tmUserId,
        meetingId,
        meetingLink,
      },
    });

    return {
      meetingId,
      meetingLink,
    };
  } catch (e) {
    if (!`${e}`.includes("每月总接口调用次数超过限制")) {
      emailRoleIgnoreError(
        "SystemAlertSubscriber",
        "会议创建失败",
        `会议创建失败：${e}`,
        getBaseUrl(),
      );
    }
    throw e;
  }
}
