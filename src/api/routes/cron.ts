import { procedure, router } from "../trpc";
import { updateOngoingMeetings } from "./meetings";
import { syncSummaries } from "./summaries";
import { authIntegration } from "../auth";
import { sendScheduledEmails } from "./scheduledEmails";
import { createAutoTasks } from "./tasks";

export default router({
  syncSummaries,
  updateOngoingMeetings: procedure
    .use(authIntegration())
    .mutation(updateOngoingMeetings),
  sendScheduledEmails: procedure
    .use(authIntegration())
    .mutation(sendScheduledEmails),
  createAutoTasks: procedure
    .use(authIntegration())
    .mutation(createAutoTasks),
});
