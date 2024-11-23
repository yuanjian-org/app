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
import { emailRole } from "api/sendgrid";

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
