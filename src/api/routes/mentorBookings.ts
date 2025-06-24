import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import {
  notFoundError
} from "../errors";
import { zMentorBooking } from "shared/MentorBooking";
import {
  mentorBookingAttributes, mentorBookingInclude
} from "api/database/models/attributesAndIncludes";
import sequelize from "api/database/sequelize";
import { emailRole } from "api/email";
import { createMessageAndScheduleEmail } from "./chats";
import { findOrCreateRoom } from "./chatsInternal";

const create = procedure
  .use(authUser())
  .input(z.object({
    requestedMentorId: z.string().nullable(),
    topic: z.string(),
  }))
  .mutation(async ({
    ctx: { user: me, baseUrl },
    input: { requestedMentorId, topic }
  }) => 
{
  await sequelize.transaction(async transaction => {
    await db.MentorBooking.create({
      requesterId: me.id,
      requestedMentorId,
      topic,
    }, { transaction });

    let requestedMentor = null;
    let markdown = `【不定期导师预约】学生预约话题：${topic}`;
    
    if (requestedMentorId) {
      requestedMentor = await db.User.findByPk(requestedMentorId, {
        attributes: ['id', 'name', 'roles'],
        transaction
      });

      if (requestedMentor) {
        markdown = `【不定期导师预约】学生预约导师：${requestedMentor.name}，话题：${topic}`;
      }
    }

    const roomPartner = requestedMentor || me;
    const room = await findOrCreateRoom(roomPartner, me.id, transaction);
    await createMessageAndScheduleEmail(
      me,
      room.id,
      markdown,
      transaction
    );

    await emailRole(
      "MentorshipManager",
      "不定期导师预约请求",
      `请访问 ${baseUrl}/mentors/bookings 查看详情，并尽快为学生安排沟通`,
      baseUrl,
    );
  });
});

const list = procedure
  .use(authUser('MentorshipManager'))
  .output(z.array(zMentorBooking))
  .query(async () => 
{
  return await db.MentorBooking.findAll({
    attributes: mentorBookingAttributes,
    include: mentorBookingInclude,
  });
});

const update = procedure
  .use(authUser('MentorshipManager'))
  .input(z.object({
    id: z.string(),
    notes: z.string().nullable(),
    assignedMentorId: z.string().nullable(),
  }))
  .mutation(async ({ ctx: { user: me }, input: { id, notes, assignedMentorId } }) => 
{
  const [cnt] = await db.MentorBooking.update({
    assignedMentorId,
    notes,
    updaterId: me.id 
  }, { where: { id } });
  if (!cnt) throw notFoundError("数据", id);
});

export default router({
  create,
  list,
  update,
});
