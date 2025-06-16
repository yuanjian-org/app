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

// These attributes are used to determine if the person has pending interviews.
// See isCandidatePending().
export const extraUserAttributesForInterviews = ["roles", "menteeStatus",
  "volunteerApplication"];

export const userAttributes = [...minUserAttributes, "wechat", "email",
  "roles", "menteeStatus", "pointOfContactNote"];

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

export const summaryAttributes = ['transcriptId', 'key', 'markdown',
  'initialLength', 'deletedLength'];

/**
 * Mentorship
 */

export const mentorshipAttributes = ['id', 'transactional', 'endsAt', 'schedule'];

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

export const interviewFeedbackAttributes = [...minInterviewFeedbackAttributes,
  "feedback"];

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
  attributes: [...minUserAttributes, ...extraUserAttributesForInterviews],
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

/**
 * Kudos
 */

export const kudosAttributes = ["createdAt", "text"];

export const kudosInclude = [{
  association: "receiver",
  attributes: minUserAttributes,
}, {
  association: "giver",
  attributes: minUserAttributes,
}];

/**
 * MentorSelection
 */

export const mentorSelectionAttributes = ["id", "reason", "order"];

export const mentorSelectionInclude = [{
  association: "mentor",
  attributes: minUserAttributes,
}];

/**
 * MentorSelectionBatch
 */

export const mentorSelectionBatchAttributes = ["id", "finalizedAt", "userId"];

export const mentorSelectionBatchInclude = [{
  association: "selections",
  attributes: mentorSelectionAttributes,
  include: mentorSelectionInclude,
}];

/**
 * Task
 */

export const taskAttributes = ["id", "autoTaskId", "markdown", "done", "updatedAt"];

export const taskInclude = [{
  association: "creator",
  attributes: minUserAttributes,
}];

/**
 * MeetingSlot
 */
export const meetingSlotAttributes = ["id", "tmUserId", "meetingId", "meetingLink", "groupId"];
