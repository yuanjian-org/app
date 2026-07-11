import { hash } from "shared/strings/hash";
import { UserDisplayData } from "components/UserDisplayData";

/**
 * Returns an array sorted in a deterministic "random" order.
 * The order is consistent from 4am of the current day to 4am of the next day,
 * and is influenced by the length of the array and a specified UUID
 * (which should be the current user id).
 */
export function dailyShuffle(
  users: UserDisplayData[],
  uuid: string,
  compare?: (a: UserDisplayData, b: UserDisplayData) => number,
) {
  const now = new Date();
  const local4am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    4,
    0,
    0,
  );

  // If current time is before 4am, consider it the previous day.
  if (now < local4am) {
    local4am.setDate(local4am.getDate() - 1);
  }

  // Generate a seeded random number generator
  function seededRandom(seed: number): () => number {
    // Linear congruential generator, by ChatGPT
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  const seed = hash(`${local4am.getTime()}-${users.length}-${uuid}`);
  const rng = seededRandom(seed);

  // First sort the array in a deterministic order
  users.sort((a, b) => a.user.id.localeCompare(b.user.id));

  // Then shuffle the array deterministically based on the seed, but first
  // sort the array based on the compare function if provided.
  return users.sort((a, b) => {
    const comp = compare ? compare(a, b) : 0;
    if (comp !== 0) return comp;
    return rng() - 0.5;
  });
}
