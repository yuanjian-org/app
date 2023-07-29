/**
 * Collect things in this file as opposed to model files to avoid cyclic dependencies.
 */
import InterviewFeedback from "./InterviewFeedback";
import User from "./User";

/**
 * User
 */

export const minUserAttributes = ['id', 'name'];

export const userAttributes = [...minUserAttributes, "email", "roles", "consentFormAcceptedAt"];

/**
 * Group
 */

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

export const minInterviewFeedbackAttributes = ["id", "feedbackCreatedAt"];

export const interviewFeedbackAttributes = [...minInterviewFeedbackAttributes, "feedback"];

export const includeForInterviewFeedback = [{
  model: User,
  attributes: minUserAttributes
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
}];
