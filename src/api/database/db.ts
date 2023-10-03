/**
 * TODO move rename folder `database` to `db`, rename this file to `db/index.ts`. Register all the models in this file.
 */
import User from "./models/User";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Transcript from "./models/Transcript";
import Summary from "./models/Summary";
import OngoingMeetings from "./models/OngoingMeetings";
import Partnership from './models/Partnership';
import Assessment from "./models/Assessment";
import Interview from "./models/Interview";
import InterviewFeedback from "./models/InterviewFeedback";
import Calibration from "./models/Calibration";
import InterviewFeedbackUpdateAttempt from "./models/InterviewFeedbackUpdateAttempt";
import ChatRoom from "./models/ChatRoom";
import ChatMessage from "./models/ChatMessage";
import SummaryNameMapping from "./models/SummaryNameMapping";

const db = {
  Partnership,
  User,
  Group,
  GroupUser,
  Transcript,
  Summary,
  OngoingMeetings,
  Assessment,
  Interview,
  InterviewFeedback,
  InterviewFeedbackUpdateAttempt,
  Calibration,
  ChatRoom,
  ChatMessage,
  SummaryNameMapping,
};

export default db;
