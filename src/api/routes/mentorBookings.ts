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

    // If a specific mentor was requested, create a chat message
    if (requestedMentorId) {
      try {
        // Get the requested mentor user object
        const requestedMentor = await db.User.findByPk(requestedMentorId, {
          attributes: ['id', 'name', 'roles'],
          transaction
        });

        if (requestedMentor) {
          // Find existing chat room for the mentee (student who made the booking)
          const room = await db.ChatRoom.findOne({
            where: { menteeId: me.id },
            attributes: ['id'],
            transaction
          });

          if (room) {
            // Create the chat message
            const markdown = `【不定期导师预约】学生预约话题：${topic}`;
            await createMessageAndScheduleEmail(
              requestedMentor, // The mentor creates the message
              room.id,
              markdown,
              transaction
            );
          } else {
            // Create chat room if it doesn't exist
            const newRoom = await db.ChatRoom.create({
              menteeId: me.id
            }, { transaction });
            const markdown = `【不定期导师预约】学生预约话题：${topic}`;
            
            await createMessageAndScheduleEmail(
              requestedMentor,
              newRoom.id,
              markdown,
              transaction
            );
          }
        }
      } catch (error: any) {
        // Log error without failing the booking creation
        console.error('Failed to create chat message for mentor booking:', error);
      }
    }

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
