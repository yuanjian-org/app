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

export const minUserAttributes = ['id', 'name', 'url'];

export const userAttributes = [...minUserAttributes, "wechat", "email",
  "roles", "consentFormAcceptedAt", "menteeInterviewerTestLastPassedAt",
  "menteeStatus", "pointOfContactNote"];

export const userInclude = [{
  association: "pointOfContact",
  attributes: minUserAttributes,
}];

/**
 * Group
 */

export const groupAttributes = ["id", "name", "public", "archived",
  "partnershipId", "interviewId", "calibrationId", "coacheeId"];

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
 * Mentorship
 */

export const mentorshipAttributes = ['id', 'endedAt'];

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
}, {
  association: "manager",
  attributes: minUserAttributes,
}];

/**
 * Interview
 */

export const interviewAttributes = ["id", "type", "decision", "createdAt"];

export const interviewInclude = [{
  model: User,
  // menteeStatus and roles are used to determine if the person's pending
  // interviews. See isCandidatePending().
  attributes: [...minUserAttributes, "roles", "menteeStatus"],
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

/**
 * MentorBooking
 */

export const mentorBookingAttributes = ["id", "topic", "notes", "createdAt"];

export const mentorBookingInclude = [{
  association: 'requester',
  attributes: minUserAttributes,
}, {
  association: 'requestedMentor',
  attributes: minUserAttributes,
}, {
  association: 'assignedMentor',
  attributes: minUserAttributes,
}, {
  association: 'updater',
  attributes: minUserAttributes,
}];
