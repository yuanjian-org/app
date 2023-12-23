/**
 * Collect things in this file as opposed to model files to avoid cyclic dependencies.
 */
import Calibration from "./Calibration";
import Group from "./Group";
import InterviewFeedback from "./InterviewFeedback";
import User from "./User";

/**
 * User
 */

export const minUserAttributes = ['id', 'name'];

export const userAttributes = [...minUserAttributes, "wechat", "sex", "email", "roles", "consentFormAcceptedAt",
  "menteeInterviewerTestLastPassedAt"];

/**
 * Group
 */

export const groupAttributes = ["id", "name", "roles", "mentorshipId", "interviewId", "calibrationId",
  "coacheeId"];

export const groupInclude = [{
  association: "users",
  attributes: minUserAttributes,
}];

/**
 * Transcript
 */

export const transcriptAttributes = ["transcriptId", "startedAt", "endedAt"];

/**
 * Summary
 */

export const summaryAttributes = ['transcriptId', 'summaryKey', 'summary'];

/**
 * Partnership / Mentorship
 */

export const mentorshipAttributes = ['id'];

export const mentorshipInclude = [{
  association: 'mentor',
  attributes: minUserAttributes,
}, {
  association: 'mentee',
  attributes: minUserAttributes,
}, {
  association: "group",
  attributes: groupAttributes,
  include: groupInclude,
}];

/**
 * InterviewFeedback
 */

export const minInterviewFeedbackAttributes = ["id", "feedbackUpdatedAt"];

export const interviewFeedbackAttributes = [...minInterviewFeedbackAttributes, "feedback"];

export const interviewFeedbackInclude = [{
  model: User,
  attributes: minUserAttributes
}];

/**
 * Callibration
 */

export const calibrationAttributes = ["id", "type", "name", "active", "createdAt"];

export const calibrationInclude = [{
  model: Group,
  attributes: groupAttributes,
  include: groupInclude,
}];

/**
 * Interview
 */

export const interviewAttributes = ["id", "type", "decision"];

export const interviewInclude = [{
  model: User,
  attributes: minUserAttributes,
}, {
  model: InterviewFeedback,
  attributes: minInterviewFeedbackAttributes,
  include: interviewFeedbackInclude,
}, {
  model: Calibration,
  attributes: calibrationAttributes,
  include: calibrationInclude,
}];

/**
 * Assessment
 */

export const assessmentAttributes = ["id", "createdAt", "summary"];

/**
 * ChatMessage
 */

export const chatMessageAttributes = ["id", "markdown", "updatedAt", "createdAt"];

export const chatMessageInclude = [{
  association: "user",
  attributes: minUserAttributes,
}];

/**
 * ChatRoom
 */

export const chatRoomAttributes = ["id"];

export const chatRoomInclude = [{
  association: "messages",
  attributes: chatMessageAttributes,
  include: chatMessageInclude,
}];
