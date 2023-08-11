import { router } from './trpc';
import users from "./routes/users";
import meetings from "./routes/meetings";
import groups from "./routes/groups";
import transcripts from './routes/transcripts';
import summaries from './routes/summaries';
import cron from './routes/cron';
import partnerships from './routes/partnerships';
import assessments from './routes/assessments';
import webhooks from './webhooks';
import interviews from './routes/interviews';
import interviewFeedbacks from './routes/interviewFeedbacks';
import calibrations from './routes/calibrations';

export const apiRouter = router({
  users,
  groups,
  meetings,
  transcripts,
  summaries,
  cron,
  partnerships,
  assessments,
  webhooks,
  interviews,
  interviewFeedbacks,
  calibrations,
});

export type ApiRouter = typeof apiRouter;
