import { procedure, router } from "../trpc";
import { syncMeetings } from "./meetings";
import { authIntegration } from "../auth";
import { sendScheduledEmails } from "./scheduledEmails";
import { createAutoTasks } from "./tasks";

export default router({
  syncMeetings: procedure
    .use(authIntegration())
    .mutation(syncMeetings),
  sendScheduledEmails: procedure
    .use(authIntegration())
    .mutation(sendScheduledEmails),
  createAutoTasks: procedure
    .use(authIntegration())
    .mutation(createAutoTasks),
});
