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

export const userAttributes = [...minUserAttributes, "email", "roles", "consentFormAcceptedAt",
  "menteeInterviewerTestLastPassedAt"];

/**
 * Group
 */

export const groupAttributes = ["id", "name", "partnershipId", "interviewId", "calibrationId"];

export const includeForGroup = [{
  model: User,
  attributes: minUserAttributes,
}];

/**
 * Partnership
 */

// Don't include private notes.
export const defaultPartnershipAttributes = ['id', 'menteeId', 'mentorId'];

export const includeForPartnership = [{
  association: 'mentor',
  attributes: minUserAttributes,
}, {
  association: 'mentee',
  attributes: minUserAttributes,
}];

/**
 * InterviewFeedback
 */

export const minInterviewFeedbackAttributes = ["id", "feedbackUpdatedAt"];

export const interviewFeedbackAttributes = [...minInterviewFeedbackAttributes, "feedback"];

export const includeForInterviewFeedback = [{
  model: User,
  attributes: minUserAttributes
}];

/**
 * Callibration
 */

export const calibrationAttributes = ["id", "type", "name", "active", "createdAt"];

export const includeForCalibration = [{
  model: Group,
  attributes: groupAttributes,
  include: includeForGroup,
}];

/**
 * Interview
 */

export const interviewAttributes = ["id", "type"];

export const includeForInterview = [{
  model: User,
  attributes: minUserAttributes,
}, {
  model: InterviewFeedback,
  attributes: minInterviewFeedbackAttributes,
  include: includeForInterviewFeedback,
}, {
  model: Calibration,
  attributes: calibrationAttributes,
  include: includeForCalibration,
}];
