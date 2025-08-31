import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { notFoundError } from "../errors";
import { zMentorBooking } from "../../shared/MentorBooking";
import {
  mentorBookingAttributes,
  mentorBookingInclude,
} from "../database/models/attributesAndIncludes";
import sequelize from "../database/sequelize";
import { emailRoles } from "../email";
import { findOrCreateRoom } from "./chatsInternal";
import { createMessageAndScheduleEmail } from "./chats";
import { transactionalMessagePrefix } from "../../shared/ChatMessage";
import { formatUserName } from "../../shared/strings";
import { Transaction } from "sequelize";
import User from "../../shared/User";

const create = procedure
  .use(authUser())
  .input(
    z.object({
      requestedMentorId: z.string().nullable(),
      topic: z.string(),
    }),
  )
  .mutation(async ({ ctx: { user: me, baseUrl }, input }) => {
    await sequelize.transaction(async (transaction) => {
      await createMentorBooking(
        me,
        input.requestedMentorId,
        input.topic,
        baseUrl,
        transaction,
      );
    });
  });

export async function createMentorBooking(
  requester: User,
  requestedMentorId: string | null,
  topic: string,
  baseUrl: string,
  transaction: Transaction,
) {
  const mentor = requestedMentorId
    ? await db.User.findByPk(requestedMentorId, { transaction })
    : null;

  await db.MentorBooking.create(
    {
      requesterId: requester.id,
      requestedMentorId,
      topic,
    },
    { transaction },
  );

  const markdown =
    transactionalMessagePrefix +
    `预约请求：导师：${mentor ? formatUserName(mentor.name) : "无"}，` +
    `主题：${topic}，`;
  const room = await findOrCreateRoom(
    requester,
    requester.id,
    transaction,
    true,
  );
  await createMessageAndScheduleEmail(
    requester,
    room.id,
    markdown,
    transaction,
    true,
  );

  await emailRoles(
    ["MentorshipManager", "MentorshipOperator"],
    "不定期导师预约请求",
    `请访问 ${baseUrl}/mentors/bookings 查看详情，并尽快为学生安排沟通`,
    baseUrl,
  );
}

const list = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .output(z.array(zMentorBooking))
  .query(async () => {
    return await db.MentorBooking.findAll({
      attributes: mentorBookingAttributes,
      include: mentorBookingInclude,
    });
  });

const update = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .input(
    z.object({
      id: z.string(),
      notes: z.string().nullable(),
      assignedMentorId: z.string().nullable(),
    }),
  )
  .mutation(
    async ({ ctx: { user: me }, input: { id, notes, assignedMentorId } }) => {
      const [cnt] = await db.MentorBooking.update(
        {
          assignedMentorId,
          notes,
          updaterId: me.id,
        },
        { where: { id } },
      );
      if (!cnt) throw notFoundError("数据", id);
    },
  );

export default router({
  create,
  list,
  update,
});
