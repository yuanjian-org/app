import { procedure, router } from "../trpc";
import { recycleMeetings, syncMeetings } from "./meetings";
import { authIntegration } from "../auth";
import { sendScheduledNotifications } from "./scheduledNotifications";
import { createAutoTasks } from "./tasks";
import { auditLastMentorshipMeetings } from "./mentorships";
import sequelize from "api/database/sequelize";
import { purgeOldData } from "./purgeOldData";
import { generateDemoData } from "./generateDemoData";
import { isDemo } from "../../shared/isDemo";
import { noPermissionError } from "../errors";
import { migrateDatabase } from "./migration";

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
  resetDemoData: procedure.use(authIntegration()).mutation(async () => {
    if (!isDemo()) throw noPermissionError("数据");

    console.log("Dropping DB schema...");
    await sequelize.drop();

    await migrateDatabase();

    await sequelize.transaction(async (transaction) => {
      await generateDemoData(transaction);
    });
  }),
});
