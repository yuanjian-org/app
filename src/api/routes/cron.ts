import { procedure, router } from "../trpc";
import { updateOngoingMeetings } from "./meetings";
import { syncSummaries } from "./summaries";
import { authIntegration } from "../auth";
import sendScheduledEmails from "./sendScheduledEmails";

export default router({
  syncSummaries,
  updateOngoingMeetings: procedure
    .use(authIntegration())
    .mutation(updateOngoingMeetings),
  sendScheduledEmails: procedure
    .use(authIntegration())
    .mutation(sendScheduledEmails),
});
