import { procedure, router } from "../trpc";
import { refreshMeetingSlots } from "./meetings";
import { syncSummaries } from "./summaries";
import { authIntegration } from "../auth";
import { sendScheduledEmails } from "./scheduledEmails";
import { createAutoTasks } from "./tasks";
import sequelize from "../database/sequelize";

export default router({
  syncSummaries,
  refreshMeetingSlots: procedure
    .use(authIntegration())
    .mutation(async () => {
      await sequelize.transaction(async transaction => {
        await refreshMeetingSlots(transaction);
      });
    }),
  sendScheduledEmails: procedure
    .use(authIntegration())
    .mutation(sendScheduledEmails),
  createAutoTasks: procedure
    .use(authIntegration())
    .mutation(createAutoTasks),
});
