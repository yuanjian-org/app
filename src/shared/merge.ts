import { isFakeEmail } from "./fakeEmail";

export const mergeTokenMaxAgeInHours = 48;

/**
 * Strictly speaking, a user cannot issue merge tokens if their `mergedTo` is
 * non-null. In practice, however, we do not need to check for that because if
 * the user can accept merges from others in the first place, their email must
 * not be fake, otherwise the merge operation will fail.
 */
export function canIssueMergeToken(email: string) {
  return !isFakeEmail(email);
}

/**
 * Strickly speaking, a user cannot accept merge tokens if their `mergedTo` is
 * non-null. In practice, however, we do not need to check for that because 1) a
 * user won't be able to sign in in the first place if they are merged, because
 * their email must be fake and wechat union id must be set to null already,
 * and 2) the merge operation checks `mergedTo` before doing the merge.
 */
export function canAcceptMergeToken(email: string) {
  return isFakeEmail(email);
}
