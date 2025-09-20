import { procedure, router } from "../trpc";
import { recycleMeetings, syncMeetings } from "./meetings";
import { authIntegration } from "../auth";
import { sendScheduledNotifications } from "./scheduledNotifications";
import { createAutoTasks } from "./tasks";
import { auditLastMentorshipMeetings } from "./mentorships";
import sequelize from "api/database/sequelize";

export default router({
  syncMeetings: procedure.use(authIntegration()).mutation(syncMeetings),
  recycleMeetings: procedure.use(authIntegration()).mutation(recycleMeetings),
  sendScheduledNotifications: procedure
    .use(authIntegration())
    .mutation(sendScheduledNotifications),
  createAutoTasks: procedure.use(authIntegration()).mutation(createAutoTasks),
  auditLastMentorshipMeetings: procedure.use(authIntegration()).mutation(
    async () =>
      await sequelize.transaction(async (transaction) => {
        await auditLastMentorshipMeetings(transaction);
      }),
  ),
});
