import { router } from './tServer';
import me from "./routes/me";
import users from "./routes/users";
import myGroups from "./routes/myGroups";
import groups from "./routes/groups";

export const apiRouter = router({
  me,
  users,
  groups,
  myGroups,
});

export type ApiRouter = typeof apiRouter;
