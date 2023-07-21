/**
 * Collect things in this file as opposed to model files to avoid cyclic dependencies.
 */
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
export const defaultAttributesForPartnership = ['id', 'menteeId', 'mentorId'];

export const includeForPartnership = [{
  association: 'mentor',
  attributes: minUserAttributes,
}, {
  association: 'mentee',
  attributes: minUserAttributes,
}];
