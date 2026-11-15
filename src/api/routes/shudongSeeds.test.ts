import { expect } from "chai";
import { zShudongEmoji } from "../../shared/Shudong";
import {
  buildShudongSeeds,
  isMentorSeedAuthor,
  RawShudongSeedThread,
  shudongSeeds,
  validateShudongSeedThreads,
} from "./shudongSeeds";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("shudongSeeds", () => {
  const menteeIds = ["mentee-1", "mentee-2", "mentee-3"];
  const mentorIds = [
    "mentor-1",
    "mentor-2",
    "mentor-3",
    "mentor-4",
    "mentor-5",
  ];

  it("builds 12 threads, 44 posts, and valid emoji reactions", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const { posts, reactions } = buildShudongSeeds(
      menteeIds,
      mentorIds,
      shudongSeeds,
      now,
    );

    const expectedTotal = shudongSeeds.reduce(
      (sum, thread) => sum + thread.posts.length,
      0,
    );
    expect(shudongSeeds.length).to.equal(12);
    expect(expectedTotal).to.equal(44);
    expect(posts.length).to.equal(44);

    const roots = posts.filter((p) => p.parentId === null);
    expect(roots.length).to.equal(12);

    const postById = new Map(posts.map((p) => [p.id, p]));
    for (const post of posts) {
      expect(post.isAnonymous).to.equal(true);
      expect(post.isAiGenerated).to.equal(true);
      expect(post.updatedAt.getTime()).to.equal(post.createdAt.getTime());
    }

    const expectedReactionsTotal = shudongSeeds.reduce(
      (sum, thread) =>
        sum +
        thread.posts.reduce(
          (pSum, post) =>
            pSum +
            (post.reactions ?? []).reduce(
              (rSum, r) => rSum + r.users.length,
              0,
            ),
          0,
        ),
      0,
    );
    expect(expectedReactionsTotal).to.be.greaterThan(0);
    expect(reactions.length).to.equal(expectedReactionsTotal);

    const seenReactionKeys = new Set<string>();
    const reactionsByPostId = new Map<string, typeof reactions>();
    for (const r of reactions) {
      const targetPost = postById.get(r.postId);
      if (!targetPost) {
        throw new Error(`Reaction references unknown post ${r.postId}`);
      }
      expect(zShudongEmoji.safeParse(r.emoji).success).to.equal(true);
      const key = `${r.postId}:${r.userId}:${r.emoji}`;
      expect(seenReactionKeys.has(key)).to.equal(false);
      seenReactionKeys.add(key);

      expect(r.createdAt.getTime()).to.be.at.least(
        targetPost.createdAt.getTime(),
      );
      expect(r.createdAt.getTime()).to.be.at.most(now.getTime());
      expect(r.updatedAt.getTime()).to.equal(r.createdAt.getTime());

      const list = reactionsByPostId.get(r.postId) ?? [];
      list.push(r);
      reactionsByPostId.set(r.postId, list);
    }

    for (const list of reactionsByPostId.values()) {
      for (let i = 1; i < list.length; i++) {
        expect(list[i].createdAt.getTime()).to.be.at.least(
          list[i - 1].createdAt.getTime(),
        );
      }
    }

    // Walk per-thread slices to verify responseCount, participant roles,
    // and times.
    let offset = 0;
    const seenRootMenteeAuthors = new Set<string>();
    const seenMentorParticipants = new Set<string>();

    for (const thread of shudongSeeds) {
      const slice = posts.slice(offset, offset + thread.posts.length);
      offset += thread.posts.length;

      const root = slice[0];
      expect(root.parentId).to.equal(null);
      expect(root.createdAt.getTime()).to.be.at.least(
        now.getTime() - 60 * MS_PER_DAY,
      );
      expect(root.createdAt.getTime()).to.be.at.most(
        now.getTime() - 2 * MS_PER_DAY,
      );

      // Distinct seed participants within the same thread must map to distinct
      // user IDs, and roles must match.
      const userIdBySeedName = new Map<string, string>();
      for (let i = 0; i < thread.posts.length; i++) {
        const raw = thread.posts[i];
        const built = slice[i];
        if (isMentorSeedAuthor(raw.author)) {
          expect(mentorIds).to.include(built.authorId);
          seenMentorParticipants.add(built.authorId);
        } else {
          expect(menteeIds).to.include(built.authorId);
          if (i === 0) {
            seenRootMenteeAuthors.add(built.authorId);
          }
        }

        const existingId = userIdBySeedName.get(raw.author);
        if (existingId) {
          expect(built.authorId).to.equal(existingId);
        } else {
          expect(Array.from(userIdBySeedName.values())).to.not.include(
            built.authorId,
          );
          userIdBySeedName.set(raw.author, built.authorId);
        }

        if (i > 0) {
          expect(built.createdAt.getTime()).to.be.greaterThan(
            slice[i - 1].createdAt.getTime(),
          );
          expect(built.createdAt.getTime()).to.be.lessThan(now.getTime());
        }
      }

      for (let i = 0; i < thread.posts.length; i++) {
        const raw = thread.posts[i];
        const built = slice[i];
        const postReactions = reactionsByPostId.get(built.id) ?? [];
        const expectedPairs = (raw.reactions ?? []).flatMap((r) =>
          r.users.map((user) => ({ emoji: r.emoji, user })),
        );
        expect(postReactions.length).to.equal(expectedPairs.length);

        expectedPairs.forEach((pair, idx) => {
          const actual = postReactions[idx];
          expect(actual.emoji).to.equal(pair.emoji);
          if (isMentorSeedAuthor(pair.user)) {
            expect(mentorIds).to.include(actual.userId);
            seenMentorParticipants.add(actual.userId);
          } else {
            expect(menteeIds).to.include(actual.userId);
          }
          const existingId = userIdBySeedName.get(pair.user);
          if (existingId) {
            expect(actual.userId).to.equal(existingId);
          } else {
            expect(Array.from(userIdBySeedName.values())).to.not.include(
              actual.userId,
            );
            userIdBySeedName.set(pair.user, actual.userId);
          }
        });
      }
    }

    // Cycling across 12 threads should use multiple mentees and mentors.
    expect(seenRootMenteeAuthors.size).to.equal(menteeIds.length);
    expect(seenMentorParticipants.size).to.equal(mentorIds.length);

    // Thread #2 (index 1) is a 4-post chain Alice -> 甲导师 -> Alice -> 甲导师.
    const thread2Start = shudongSeeds[0].posts.length;
    const thread2Counts = posts
      .slice(thread2Start, thread2Start + shudongSeeds[1].posts.length)
      .map((p) => p.responseCount);
    expect(thread2Counts).to.deep.equal([3, 2, 1, 0]);
  });

  it("rejects malformed seed threads", () => {
    const invalidCases: {
      name: string;
      threads: readonly RawShudongSeedThread[];
      errorPart: string;
    }[] = [
      {
        name: "empty thread list",
        threads: [],
        errorPart: "No threads",
      },
      {
        name: "empty post list",
        threads: [{ posts: [] }],
        errorPart: "No posts",
      },
      {
        name: "non-null replyTo on root",
        threads: [
          { posts: [{ author: "Alice", replyTo: "Bob", markdown: "hi" }] },
        ],
        errorPart: "replyTo must be null",
      },
      {
        name: "multiple roots in one thread",
        threads: [
          {
            posts: [
              { author: "Alice", replyTo: null, markdown: "q1" },
              { author: "Bob", replyTo: null, markdown: "q2" },
            ],
          },
        ],
        errorPart: "Multiple root questions",
      },
      {
        name: "empty markdown",
        threads: [
          { posts: [{ author: "Alice", replyTo: null, markdown: "   " }] },
        ],
        errorPart: "Empty post",
      },
      {
        name: "reply to unknown author",
        threads: [
          {
            posts: [
              { author: "Alice", replyTo: null, markdown: "q1" },
              { author: "Bob", replyTo: "Carol", markdown: "r1" },
            ],
          },
        ],
        errorPart: "unknown author 'Carol'",
      },
      {
        name: "reply to later author",
        threads: [
          {
            posts: [
              { author: "Alice", replyTo: null, markdown: "q1" },
              { author: "Bob", replyTo: "Carol", markdown: "r1" },
              { author: "Carol", replyTo: "Alice", markdown: "r2" },
            ],
          },
        ],
        errorPart: "unknown author 'Carol'",
      },
      {
        name: "invalid reaction emoji",
        threads: [
          {
            posts: [
              {
                author: "Alice",
                replyTo: null,
                markdown: "q1",
                reactions: [{ emoji: "🚀", users: ["Bob"] }],
              },
            ],
          },
        ],
        errorPart: "Invalid emoji '🚀'",
      },
      {
        name: "duplicate reaction emoji on same post",
        threads: [
          {
            posts: [
              {
                author: "Alice",
                replyTo: null,
                markdown: "q1",
                reactions: [
                  { emoji: "👍", users: ["Bob"] },
                  { emoji: "👍", users: ["Carol"] },
                ],
              },
            ],
          },
        ],
        errorPart: "Duplicate emoji '👍'",
      },
      {
        name: "empty users list on reaction",
        threads: [
          {
            posts: [
              {
                author: "Alice",
                replyTo: null,
                markdown: "q1",
                reactions: [{ emoji: "👍", users: [] }],
              },
            ],
          },
        ],
        errorPart: "Empty users list",
      },
      {
        name: "duplicate user in reaction users",
        threads: [
          {
            posts: [
              {
                author: "Alice",
                replyTo: null,
                markdown: "q1",
                reactions: [{ emoji: "👍", users: ["Bob", "Bob"] }],
              },
            ],
          },
        ],
        errorPart: "Duplicate user 'Bob'",
      },
    ];

    for (const c of invalidCases) {
      expect(() => validateShudongSeedThreads(c.threads), c.name).to.throw(
        c.errorPart,
      );
    }
  });
});
