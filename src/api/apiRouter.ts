import { router } from './trpc';
import me from "./routes/me";
import users from "./routes/users";
import myGroups from "./routes/myGroups";
import groups from "./routes/groups";
import transcripts from './routes/transcripts';

export const apiRouter = router({
  me,
  users,
  groups,
  myGroups,
  transcripts,
});

export type ApiRouter = typeof apiRouter;
