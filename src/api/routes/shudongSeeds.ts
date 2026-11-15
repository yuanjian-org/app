import { randomUUID } from "crypto";
import moment from "moment-timezone";
import invariant from "shared/invariant";
import { ShudongEmoji, zShudongEmoji } from "../../shared/Shudong";
import rawShudongSeeds from "./shudongSeedThreads.json";

export type RawShudongSeedReaction = {
  emoji: string;
  users: readonly string[];
};

export type RawShudongSeedPost = {
  author: string;
  replyTo: string | null;
  markdown: string;
  reactions?: readonly RawShudongSeedReaction[];
};

export type RawShudongSeedThread = {
  title?: string;
  posts: readonly RawShudongSeedPost[];
};

export type BuiltShudongSeedPost = {
  id: string;
  parentId: string | null;
  authorId: string;
  isAnonymous: boolean;
  isAiGenerated: boolean;
  markdown: string;
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BuiltShudongSeedReaction = {
  postId: string;
  userId: string;
  emoji: ShudongEmoji;
  createdAt: Date;
  updatedAt: Date;
};

export type BuiltShudongSeeds = {
  posts: BuiltShudongSeedPost[];
  reactions: BuiltShudongSeedReaction[];
};

export const shudongSeeds: readonly RawShudongSeedThread[] = rawShudongSeeds;

// Time zone used to model when users are active.
const ACTIVITY_TZ = "Asia/Shanghai";

// Relative posting activity for each local hour 0-23. Low overnight, peaks
// late morning, afternoon and late evening, typical for students and young
// professionals.
const HOUR_WEIGHTS = [
  4, 2, 1, 0.5, 0.3, 0.3, 0.8, 2, 4, 6, 8, 9, 7, 6, 7, 8, 8, 7, 7, 8, 10, 11,
  10, 7,
];
const MAX_HOUR_WEIGHT = Math.max(...HOUR_WEIGHTS);

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

// All posts are created within this window before now.
const WINDOW_MS = 60 * MS_PER_DAY;

// Root questions are created at least this long before now so that their
// replies have time to accumulate.
const MIN_ROOT_AGE_MS = 2 * MS_PER_DAY;

// Reply delays (in minutes) after the previous post in the thread are drawn
// from a log-normal distribution with this median and sigma, then filtered by
// HOUR_WEIGHTS: most replies arrive within hours, and a few take a day or
// more.
const REPLY_DELAY_MEDIAN_MIN = 150;
const REPLY_DELAY_SIGMA = 1.1;

// Minimum time (in minutes) it takes to write a reply.
const REPLY_DELAY_MIN_MIN = 4;

/**
 * Returns true if the seed participant name represents a mentor (e.g.
 * "甲导师").
 */
export function isMentorSeedAuthor(author: string): boolean {
  return author.endsWith("导师");
}

function validatePostReactions(
  reactions: readonly RawShudongSeedReaction[] | undefined,
  postIndex: number,
  where: string,
): void {
  if (!reactions) {
    return;
  }
  const seenEmojis = new Set<string>();
  for (const reaction of reactions) {
    const parsedEmoji = zShudongEmoji.safeParse(reaction.emoji);
    invariant(
      parsedEmoji.success,
      `Invalid emoji '${reaction.emoji}' on post #${postIndex + 1}` +
        ` in ${where}.`,
    );
    invariant(
      !seenEmojis.has(reaction.emoji),
      `Duplicate emoji '${reaction.emoji}' on post #${postIndex + 1}` +
        ` in ${where}.`,
    );
    seenEmojis.add(reaction.emoji);
    invariant(
      reaction.users.length > 0,
      `Empty users list for emoji '${reaction.emoji}' on post` +
        ` #${postIndex + 1} in ${where}.`,
    );
    const seenUsers = new Set<string>();
    for (const user of reaction.users) {
      invariant(
        user.trim().length > 0,
        `Empty user in reaction '${reaction.emoji}' on post` +
          ` #${postIndex + 1} in ${where}.`,
      );
      invariant(
        !seenUsers.has(user),
        `Duplicate user '${user}' for emoji '${reaction.emoji}' on post` +
          ` #${postIndex + 1} in ${where}.`,
      );
      seenUsers.add(user);
    }
  }
}

/**
 * Validates thread, post, and reaction invariants on Shudong seed data.
 */
export function validateShudongSeedThreads(
  threads: readonly RawShudongSeedThread[],
): void {
  invariant(threads.length > 0, "No threads found in shudong seeds.");
  for (let t = 0; t < threads.length; t++) {
    const thread = threads[t];
    const where = `thread #${t + 1}`;
    invariant(thread.posts.length > 0, `No posts in ${where}.`);
    invariant(
      thread.posts[0].replyTo === null,
      `First post in ${where} must be a root question (replyTo must be null).`,
    );
    for (let i = 0; i < thread.posts.length; i++) {
      const post = thread.posts[i];
      if (i > 0) {
        invariant(
          post.replyTo !== null,
          `Multiple root questions in ${where}.`,
        );
      }
      invariant(
        post.author.trim().length > 0,
        `Empty author on post #${i + 1} in ${where}.`,
      );
      invariant(
        post.markdown.trim().length > 0,
        `Empty post by '${post.author}' in ${where}.`,
      );
      if (post.replyTo !== null) {
        const hasParent = thread.posts
          .slice(0, i)
          .some((p) => p.author === post.replyTo);
        invariant(
          hasParent,
          `'${post.author}' replies to unknown author '${post.replyTo}'` +
            ` in ${where}.`,
        );
      }
      validatePostReactions(post.reactions, i, where);
    }
  }
}

function acceptHour(t: Date): boolean {
  const hour = moment(t).tz(ACTIVITY_TZ).hour();
  return Math.random() < HOUR_WEIGHTS[hour] / MAX_HOUR_WEIGHT;
}

function randomRootTime(now: Date): Date {
  const startMs = now.getTime() - WINDOW_MS;
  const spanMs = WINDOW_MS - MIN_ROOT_AGE_MS;
  while (true) {
    // Beta(1.4, 1) has CDF x^1.4, so U^(1 / 1.4) samples from Beta(1.4, 1).
    const u = Math.pow(Math.random(), 1 / 1.4);
    const t = new Date(startMs + spanMs * u);
    if (acceptHour(t)) {
      return t;
    }
  }
}

function randomTimeAfter(
  after: Date,
  now: Date,
  fallbackMinFraction: number,
  fallbackMaxFraction: number,
): Date {
  for (let attempt = 0; attempt < 100; attempt++) {
    // Box-Muller transform using 1 - Math.random() in (0, 1] to avoid log(0).
    const u1 = 1 - Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const logNorm = Math.exp(
      Math.log(REPLY_DELAY_MEDIAN_MIN) + REPLY_DELAY_SIGMA * z,
    );
    const delayMin = Math.max(REPLY_DELAY_MIN_MIN, logNorm);
    const t = new Date(after.getTime() + delayMin * MS_PER_MINUTE);
    if (t.getTime() < now.getTime() && acceptHour(t)) {
      return t;
    }
  }
  const remaining = now.getTime() - after.getTime();
  const fraction =
    fallbackMinFraction +
    (fallbackMaxFraction - fallbackMinFraction) * Math.random();
  return new Date(after.getTime() + remaining * fraction);
}

function randomReactionTimes(
  postCreatedAt: Date,
  now: Date,
  count: number,
): Date[] {
  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    times.push(randomTimeAfter(postCreatedAt, now, 0.05, 0.95));
  }
  times.sort((a, b) => a.getTime() - b.getTime());
  return times;
}

function recordParticipant(
  name: string,
  uniqueMentees: string[],
  uniqueMentors: string[],
): void {
  const target = isMentorSeedAuthor(name) ? uniqueMentors : uniqueMentees;
  if (!target.includes(name)) {
    target.push(name);
  }
}

function buildThreadUserMap(
  threadIndex: number,
  posts: readonly RawShudongSeedPost[],
  menteeIds: readonly string[],
  mentorIds: readonly string[],
): Map<string, string> {
  const uniqueMentees: string[] = [];
  const uniqueMentors: string[] = [];
  for (const post of posts) {
    recordParticipant(post.author, uniqueMentees, uniqueMentors);
  }
  for (const post of posts) {
    for (const reaction of post.reactions ?? []) {
      for (const user of reaction.users) {
        recordParticipant(user, uniqueMentees, uniqueMentors);
      }
    }
  }

  invariant(
    uniqueMentees.length <= menteeIds.length,
    `Thread #${threadIndex + 1} needs ${uniqueMentees.length} mentee IDs,` +
      ` got ${menteeIds.length}.`,
  );
  invariant(
    uniqueMentors.length <= mentorIds.length,
    `Thread #${threadIndex + 1} needs ${uniqueMentors.length} mentor IDs,` +
      ` got ${mentorIds.length}.`,
  );

  // Cycle user IDs across threads within each role so the same seed name
  // maps to different users across threads while different participants in
  // the same thread always map to different users.
  const userMap = new Map<string, string>();
  uniqueMentees.forEach((name, j) => {
    userMap.set(name, menteeIds[(threadIndex + j) % menteeIds.length]);
  });
  uniqueMentors.forEach((name, k) => {
    userMap.set(name, mentorIds[(threadIndex + k) % mentorIds.length]);
  });
  return userMap;
}

/**
 * Converts seed threads into ShudongPost and ShudongReaction rows with
 * realistic timestamps, role-matched user IDs, resolved parent IDs, and
 * ancestor responseCounts.
 */
export function buildShudongSeeds(
  menteeIds: readonly string[],
  mentorIds: readonly string[],
  threads: readonly RawShudongSeedThread[] = shudongSeeds,
  now: Date = new Date(),
): BuiltShudongSeeds {
  validateShudongSeedThreads(threads);

  const posts: BuiltShudongSeedPost[] = [];
  const reactions: BuiltShudongSeedReaction[] = [];
  for (let t = 0; t < threads.length; t++) {
    const thread = threads[t];
    const userMap = buildThreadUserMap(t, thread.posts, menteeIds, mentorIds);
    const byId = new Map<string, BuiltShudongSeedPost>();
    const latestByAuthor = new Map<string, BuiltShudongSeedPost>();
    let prevCreatedAt: Date | null = null;

    for (const rawPost of thread.posts) {
      const id = randomUUID();
      const authorId = userMap.get(rawPost.author);
      invariant(authorId, `Missing author mapping for '${rawPost.author}'.`);

      let parentId: string | null = null;
      let createdAt: Date;
      if (rawPost.replyTo === null) {
        createdAt = randomRootTime(now);
      } else {
        const parent = latestByAuthor.get(rawPost.replyTo);
        invariant(parent, `Missing parent post for '${rawPost.replyTo}'.`);
        parentId = parent.id;

        // Increment responseCount across all ancestors in the parent chain to
        // match createPostImpl() in src/api/routes/shudong.ts.
        let curr: BuiltShudongSeedPost | undefined = parent;
        while (curr) {
          curr.responseCount += 1;
          curr = curr.parentId ? byId.get(curr.parentId) : undefined;
        }

        invariant(prevCreatedAt, "Missing previous post timestamp.");
        createdAt = randomTimeAfter(prevCreatedAt, now, 0.2, 0.8);
      }

      const builtPost: BuiltShudongSeedPost = {
        id,
        parentId,
        authorId,
        isAnonymous: true,
        isAiGenerated: true,
        markdown: rawPost.markdown.trim(),
        responseCount: 0,
        createdAt,
        updatedAt: createdAt,
      };
      byId.set(id, builtPost);
      latestByAuthor.set(rawPost.author, builtPost);
      prevCreatedAt = createdAt;
      posts.push(builtPost);

      const pairs: { emoji: ShudongEmoji; user: string }[] = [];
      for (const rawReaction of rawPost.reactions ?? []) {
        const parsedEmoji = zShudongEmoji.parse(rawReaction.emoji);
        for (const user of rawReaction.users) {
          pairs.push({ emoji: parsedEmoji, user });
        }
      }
      if (pairs.length > 0) {
        const times = randomReactionTimes(createdAt, now, pairs.length);
        pairs.forEach((pair, idx) => {
          const userId = userMap.get(pair.user);
          invariant(userId, `Missing user mapping for '${pair.user}'.`);
          const reactionTime = times[idx];
          reactions.push({
            postId: id,
            userId,
            emoji: pair.emoji,
            createdAt: reactionTime,
            updatedAt: reactionTime,
          });
        });
      }
    }
  }
  return { posts, reactions };
}
