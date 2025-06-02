import { procedure, router } from "../trpc";
import { z } from "zod";
import db from "../database/db";

export const meetingSlotRouter = router({
  list: procedure.query(async () => {
    return await db.MeetingSlot.findAll({
      attributes: ["id", "tmUserId", "meetingId", "meetingLink", "groupId", "updatedAt"],
      order: [["updatedAt", "DESC"]],
    });
  }),

  update: procedure
    .input(
      z.object({
        id: z.number(),
        meetingId: z.string().optional(),
        meetingLink: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      
      return await db.MeetingSlot.update(updateData, {
        where: { id },
        returning: true,
      });
    }),
});