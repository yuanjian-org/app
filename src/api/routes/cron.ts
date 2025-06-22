import { procedure, router } from "../trpc";
import { recycleMeetings, syncMeetings } from "./meetings";
import { authIntegration } from "../auth";
import { sendScheduledEmails } from "./scheduledEmails";
import { createAutoTasks } from "./tasks";

export default router({
  syncMeetings: procedure
    .use(authIntegration())
    .mutation(syncMeetings),
  recycleMeetings: procedure
    .use(authIntegration())
    .mutation(recycleMeetings),
  sendScheduledEmails: procedure
    .use(authIntegration())
    .mutation(sendScheduledEmails),
  createAutoTasks: procedure
    .use(authIntegration())
    .mutation(createAutoTasks),
});
