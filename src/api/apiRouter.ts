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
import match from './routes/match';
import migration from './routes/migration';
import map from './routes/map';
import mentorBookings from './routes/mentorBookings';
import merge from './routes/merge';
import kudos from './routes/kudos';
import mentorSelections from './routes/mentorSelections';
import tasks from './routes/tasks';

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
  match,
  map,
  migration,
  mentorBookings,
  merge,
  kudos,
  mentorSelections,
  tasks,
});

export type ApiRouter = typeof apiRouter;
