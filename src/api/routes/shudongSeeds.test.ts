import { expect } from "chai";
import {
  buildShudongSeedPosts,
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

  it("builds 12 threads and 44 posts with valid metadata and counts", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const posts = buildShudongSeedPosts(
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

    for (const post of posts) {
      expect(post.isAnonymous).to.equal(true);
      expect(post.isAiGenerated).to.equal(true);
      expect(post.upvoteCount).to.equal(0);
      expect(post.updatedAt.getTime()).to.equal(post.createdAt.getTime());
    }

    // Walk per-thread slices to verify responseCount, author roles, and times.
    let offset = 0;
    const seenRootMenteeAuthors = new Set<string>();
    const seenMentorAuthors = new Set<string>();

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

      // Distinct seed authors within the same thread must map to distinct
      // user IDs, and roles must match.
      const authorIdBySeedName = new Map<string, string>();
      for (let i = 0; i < thread.posts.length; i++) {
        const raw = thread.posts[i];
        const built = slice[i];
        if (isMentorSeedAuthor(raw.author)) {
          expect(mentorIds).to.include(built.authorId);
          seenMentorAuthors.add(built.authorId);
        } else {
          expect(menteeIds).to.include(built.authorId);
          if (i === 0) {
            seenRootMenteeAuthors.add(built.authorId);
          }
        }

        const existingId = authorIdBySeedName.get(raw.author);
        if (existingId) {
          expect(built.authorId).to.equal(existingId);
        } else {
          expect(Array.from(authorIdBySeedName.values())).to.not.include(
            built.authorId,
          );
          authorIdBySeedName.set(raw.author, built.authorId);
        }

        if (i > 0) {
          expect(built.createdAt.getTime()).to.be.greaterThan(
            slice[i - 1].createdAt.getTime(),
          );
          expect(built.createdAt.getTime()).to.be.lessThan(now.getTime());
        }
      }
    }

    // Cycling across 12 threads should use multiple mentees and mentors.
    expect(seenRootMenteeAuthors.size).to.equal(menteeIds.length);
    expect(seenMentorAuthors.size).to.equal(mentorIds.length);

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
    ];

    for (const c of invalidCases) {
      expect(() => validateShudongSeedThreads(c.threads), c.name).to.throw(
        c.errorPart,
      );
    }
  });
});
