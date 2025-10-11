import { procedure, router } from "../trpc";
import { recycleMeetings, syncMeetings } from "./meetings";
import { authIntegration } from "../auth";
import { sendScheduledNotifications } from "./scheduledNotifications";
import { createAutoTasks } from "./tasks";
import { auditLastMentorshipMeetings } from "./mentorships";
import sequelize from "api/database/sequelize";
import { purgeOldData } from "./purgeOldData";

export default router({
  /**
   * Hourly cron jobs. See hourly.yml.
   */
  syncMeetings: procedure.use(authIntegration()).mutation(syncMeetings),
  sendScheduledNotifications: procedure
    .use(authIntegration())
    .mutation(sendScheduledNotifications),
  createAutoTasks: procedure.use(authIntegration()).mutation(createAutoTasks),

  /**
   * Weekly cron jobs. See weekly.yml.
   */
  auditLastMentorshipMeetings: procedure.use(authIntegration()).mutation(
    async () =>
      await sequelize.transaction(async (transaction) => {
        await auditLastMentorshipMeetings(transaction);
      }),
  ),
  recycleMeetings: procedure.use(authIntegration()).mutation(recycleMeetings),
  purgeOldData: procedure.use(authIntegration()).mutation(purgeOldData),
});
