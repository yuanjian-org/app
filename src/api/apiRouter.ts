import { router } from './tServer';
import user from "./routes/user";
import userManagement from "./routes/userManagement";
import myMeetings from "./routes/myMeetings";
import groupManagement from "./routes/groupManagement";

export const apiRouter = router({
  user,
  userManagement,
  groupManagement,
  myMeetings,
});

export type ApiRouter = typeof apiRouter;
