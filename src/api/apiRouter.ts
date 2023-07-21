import { router } from './trpc';
import me from "./routes/me";
import users from "./routes/users";
import meetings from "./routes/meetings";
import groups from "./routes/groups";
import transcripts from './routes/transcripts';
import summaries from './routes/summaries';
import cron from './routes/cron';
import partnerships from './routes/partnerships';
import assessments from './routes/assessments';
import webhooks from './webhooks';

export const apiRouter = router({
  me,
  users,
  groups,
  meetings,
  transcripts,
  summaries,
  cron,
  partnerships,
  assessments,
  webhooks,
});

export type ApiRouter = typeof apiRouter;
