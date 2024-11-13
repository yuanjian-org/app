import { router } from './trpc';
import users from "./routes/users";
import meetings from "./routes/meetings";
import groups from "./routes/groups";
import transcripts from './routes/transcripts';
import summaries from './routes/summaries';
import cron from './routes/cron';
import mentorships from './routes/mentorships';
import assessments from './routes/assessments';
import webhooks from './webhooks';
import interviews from './routes/interviews';
import interviewFeedbacks from './routes/interviewFeedbacks';
import calibrations from './routes/calibrations';
import chat from './routes/chat';
import matchmaker from './routes/matchmaker';
import migration from './routes/migration';
import map from './routes/map';
import uploads from './routes/uploads';

export const apiRouter = router({
  users,
  groups,
  meetings,
  transcripts,
  summaries,
  cron,
  mentorships,
  assessments,
  webhooks,
  interviews,
  interviewFeedbacks,
  calibrations,
  chat,
  matchmaker,
  map,
  migration,
  uploads,
});

export type ApiRouter = typeof apiRouter;
