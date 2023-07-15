/**
 * Collect things in this file as opposed to model files to avoid cyclic dependencies.
 */
import User from "./User";

/**
 * User
 */

const minUserProfileAttributes = ['id', 'name'];

export default minUserProfileAttributes;

/**
 * Group
 */

export const includeForGroup = [{
  model: User,
  attributes: minUserProfileAttributes,
}];

/**
 * Partnership
 */

// Don't include private notes.
export const defaultAttributesForPartnership = ['id', 'menteeId', 'mentorId'];

export const includeForPartnership = [{
  association: 'mentor',
  attributes: minUserProfileAttributes,
}, {
  association: 'mentee',
  attributes: minUserProfileAttributes,
}];
