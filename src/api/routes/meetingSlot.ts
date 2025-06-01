import { procedure, router } from "../trpc";
import db from "../database/db";
export const meetingSlotRouter = router({
  list: procedure.query(async () => {
    return await db.MeetingSlot.findAll({
      attributes: ["id", "tmUserId", "meetingId", "meetingLink", "groupId", "updatedAt"],
      order: [["updatedAt", "DESC"]],
    });
  }),

  // Add more procedures if needed
});