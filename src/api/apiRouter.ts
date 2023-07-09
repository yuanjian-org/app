import { router } from './trpc';
import me from "./routes/me";
import users from "./routes/users";
import myGroups from "./routes/myGroups";
import groups from "./routes/groups";
import transcripts from './routes/transcripts';
import summaries from './routes/summaries';
import cron from './routes/cron';
import partnerships from './routes/partnerships';

export const apiRouter = router({
  me,
  users,
  groups,
  myGroups,
  transcripts,
  summaries,
  cron,
  partnerships,
});

export type ApiRouter = typeof apiRouter;
