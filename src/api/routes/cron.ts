import { procedure, router } from "../trpc";
import { updateOngoingMeetings } from "./meetings";
import { syncSummaries } from "./summaries";

export default router({
  syncSummaries,
  updateOngoingMeetings: procedure.mutation(updateOngoingMeetings),
});
