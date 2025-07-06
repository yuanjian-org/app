/**
 * TODO move rename folder `database` to `db`, rename this file to `db/index.ts`.
 * Register all the models in this file.
 */
import User from "./models/User";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Transcript from "./models/Transcript";
import Summary from "./models/Summary";
import Mentorship from "./models/Mentorship";
import Assessment from "./models/Assessment";
import Interview from "./models/Interview";
import InterviewFeedback from "./models/InterviewFeedback";
import Calibration from "./models/Calibration";
import InterviewFeedbackUpdateAttempt from "./models/InterviewFeedbackUpdateAttempt";
import ChatRoom from "./models/ChatRoom";
import ChatMessage from "./models/ChatMessage";
import LandmarkAssessment from "./models/map/LandmarkAssessment";
import MentorBooking from "./models/MentorBooking";
import MergeToken from "./models/MergeToken";
import ScheduledEmail from "./models/ScheduledEmail";
import EventLog from "./models/EventLog";
import Kudos from "./models/Kudos";
import LastReadChatRoom from "./models/LastReadChatRoom";
import DraftChatMessage from "./models/DraftChatMessage";
import MentorSelection from "./models/MentorSelection";
import MentorSelectionBatch from "./models/MentorSelectionBatch";
import Task from "./models/Task";
import MeetingSlot from "./models/MeetingSlot";
import MeetingHistory from "./models/MeetingHistory";
import MatchFeedback from "./models/MatchFeedback";
import GlobalConfig from "./models/GlobalConfig";
import DeletedSummary from "./models/DeletedSummary";

const db = {
  Mentorship,
  User,
  Group,
  GroupUser,
  Transcript,
  Summary,
  MeetingSlot,
  MeetingHistory,
  Assessment,
  Interview,
  InterviewFeedback,
  InterviewFeedbackUpdateAttempt,
  Calibration,
  ChatRoom,
  ChatMessage,
  LandmarkAssessment,
  MentorBooking,
  MergeToken,
  ScheduledEmail,
  EventLog,
  Kudos,
  LastReadChatRoom,
  DraftChatMessage,
  MentorSelection,
  MentorSelectionBatch,
  Task,
  MatchFeedback,
  GlobalConfig,
  DeletedSummary,
};

export default db;
