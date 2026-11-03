import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import { Transaction, Op } from "sequelize";
import User from "shared/User";
import {
  canAccessShudong,
  canEditOrDeleteShudongPost,
} from "../../shared/ShudongPermissions";
import { zShudongPost, ShudongPost } from "../../shared/Shudong";
import ShudongPostModel from "../database/models/ShudongPost";
import {
  shudongPostAttributes,
  shudongPostInclude,
} from "../database/models/attributesAndIncludes";
import invariant from "shared/invariant";
import sequelize from "../database/sequelize";
import { scheduleNotificationBeforeSavingData } from "./scheduledNotifications";
import { shudongNewQuestionSubjectId } from "./shudongInternal";

/**
 * Common where condition for active or soft-deleted posts that have replies.
 * Soft-deleted posts with responseCount > 0 are retained so that response
 * threads beneath them remain accessible.
 */
export const shudongPostWhereCondition = {
  [Op.or]: [{ deletedAt: null }, { responseCount: { [Op.gt]: 0 } }],
};

/**
 * Throws a permission error if the current user is not authorized to use
 * Shudong.
 */
export function checkShudongAccess(me: User) {
  if (!canAccessShudong(me)) {
    throw noPermissionError("树洞");
  }
}

/**
 * Recursively traverses parent posts to find the root question ID.
 */
export async function findRootQuestionId(
  postId: string,
  transaction?: Transaction,
): Promise<string> {
  let curr = await db.ShudongPost.findByPk(postId, {
    attributes: ["id", "parentId"],
    transaction,
  });
  while (curr && curr.parentId) {
    curr = await db.ShudongPost.findByPk(curr.parentId, {
      attributes: ["id", "parentId"],
      transaction,
    });
  }
  return curr ? curr.id : postId;
}

/**
 * Retrieves a post by PK and throws a notFoundError if missing or soft-deleted.
 */
export async function findShudongPostOrThrow(
  postId: string,
  transaction?: Transaction,
) {
  const post = await db.ShudongPost.findByPk(postId, {
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });
  if (!post || post.deletedAt !== null) {
    throw notFoundError("树洞帖子", postId);
  }
  return post;
}

const HEAVENLY_STEMS = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸",
];

/**
 * Converts a 0-indexed number into a Chinese Heavenly Stem suffix
 * (0 -> "甲", 1 -> "乙", ..., 9 -> "癸", 10 -> "甲甲", 11 -> "甲乙", etc.).
 */
export function getLetterSuffix(index: number): string {
  let result = "";
  let i = index;
  while (i >= 0) {
    result = HEAVENLY_STEMS[i % 10] + result;
    i = Math.floor(i / 10) - 1;
  }
  return result;
}

export interface ThreadAuthorInfo {
  /**
   * User ID of the poster who created the root question (楼主).
   */
  rootAuthorId: string;
  /**
   * Map from respondent User ID to their assigned pseudo-anonymous label (e.g., "匿名 甲", "匿名 乙").
   */
  respondentMap: Map<string, string>;
}

/**
 * Computes root author ID and pseudo-anonymous label mapping for respondents
 * within a single question thread.
 */
export async function getThreadAuthorMap(
  rootQuestionId: string,
  transaction?: Transaction,
): Promise<ThreadAuthorInfo> {
  const rootQuestion = await db.ShudongPost.findByPk(rootQuestionId, {
    attributes: ["id", "authorId"],
    transaction,
  });
  if (!rootQuestion) {
    return { rootAuthorId: "", respondentMap: new Map() };
  }

  let currentParentIds = [rootQuestionId];
  const allThreadPosts: { authorId: string; createdAt: Date }[] = [];

  while (currentParentIds.length > 0) {
    const children = await db.ShudongPost.findAll({
      where: {
        parentId: { [Op.in]: currentParentIds },
      },
      attributes: ["id", "authorId", "createdAt"],
      order: [["createdAt", "ASC"]],
      transaction,
    });
    if (children.length === 0) break;
    allThreadPosts.push(...children);
    currentParentIds = children.map((c) => c.id);
  }

  allThreadPosts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const respondentMap = new Map<string, string>();
  let count = 0;

  for (const post of allThreadPosts) {
    if (post.authorId === rootQuestion.authorId) {
      continue;
    }
    if (!respondentMap.has(post.authorId)) {
      const label = `匿名 ${getLetterSuffix(count)}`;
      respondentMap.set(post.authorId, label);
      count++;
    }
  }

  return { rootAuthorId: rootQuestion.authorId, respondentMap };
}

/**
 * Formats a raw DB ShudongPost for client consumption.
 * Anonymizes author info if the post is marked anonymous or soft-deleted.
 * Checks whether the current user has upvoted and subscribed to the post.
 * Assigns pseudo-anonymous labels scoped within the question thread.
 */
export async function formatShudongPost(
  post: ShudongPostModel,
  myId: string,
  threadAuthorInfo?: ThreadAuthorInfo,
  transaction?: Transaction,
): Promise<ShudongPost> {
  const upvote = await db.ShudongUpvote.findOne({
    where: { postId: post.id, userId: myId },
    attributes: ["userId"],
    transaction,
  });

  const rootQuestionId = post.parentId
    ? await findRootQuestionId(post.id, transaction)
    : post.id;

  const subscription = await db.ShudongSubscription.findOne({
    where: { questionId: rootQuestionId, userId: myId },
    attributes: ["userId"],
    transaction,
  });

  const isDeleted = post.deletedAt !== null;
  const isAnonymous = isDeleted || post.isAnonymous;
  const author = !isAnonymous && post.author ? post.author : null;

  let anonymousName: string | null = null;
  if (isAnonymous) {
    const info =
      threadAuthorInfo ??
      (await getThreadAuthorMap(rootQuestionId, transaction));
    if (post.authorId === info.rootAuthorId) {
      anonymousName = "匿名楼主";
    } else {
      anonymousName = info.respondentMap.get(post.authorId) || "匿名 甲";
    }
  }

  return zShudongPost.parse({
    id: post.id,
    parentId: post.parentId,
    author,
    markdown: post.markdown,
    upvoteCount: post.upvoteCount,
    responseCount: post.responseCount,
    isDeleted,
    isAiGenerated: post.isAiGenerated ?? false,
    lastEditedAt: post.lastEditedAt,
    createdAt: post.createdAt,
    userHasUpvoted: !!upvote,
    userIsSubscribed: !!subscription,
    anonymousName,
  });
}

/**
 * Lists top-level questions (parentId = null).
 */
export async function listQuestionsImpl(
  me: User,
  limit = 20,
  offset = 0,
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const questions = await db.ShudongPost.findAll({
    where: {
      parentId: null,
      ...shudongPostWhereCondition,
    },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });

  const items: ShudongPost[] = [];
  for (const q of questions) {
    const threadAuthorInfo = await getThreadAuthorMap(q.id, transaction);
    items.push(
      await formatShudongPost(q, me.id, threadAuthorInfo, transaction),
    );
  }
  return items;
}

/**
 * Retrieves child responses for any parent post (response or sub-response).
 */
export async function getResponsesImpl(
  me: User,
  parentId: string,
  threadAuthorInfo?: ThreadAuthorInfo,
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const responsesRaw = await db.ShudongPost.findAll({
    where: {
      parentId,
      ...shudongPostWhereCondition,
    },
    order: [["createdAt", "ASC"]],
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });

  const info =
    threadAuthorInfo ??
    (await getThreadAuthorMap(
      await findRootQuestionId(parentId, transaction),
      transaction,
    ));

  const responses: ShudongPost[] = [];
  for (const r of responsesRaw) {
    responses.push(await formatShudongPost(r, me.id, info, transaction));
  }
  return responses;
}

/**
 * Retrieves a root question and its top-level responses.
 */
export async function getQuestionImpl(
  me: User,
  questionId: string,
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const q = await db.ShudongPost.findByPk(questionId, {
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });
  if (!q || (q.deletedAt !== null && q.responseCount === 0)) {
    throw notFoundError("树洞帖子", questionId);
  }

  const threadAuthorInfo = await getThreadAuthorMap(questionId, transaction);
  const question = await formatShudongPost(
    q,
    me.id,
    threadAuthorInfo,
    transaction,
  );
  const responses = await getResponsesImpl(
    me,
    questionId,
    threadAuthorInfo,
    transaction,
  );

  return { question, responses };
}

/**
 * Creates a new question or response.
 */
export async function createPostImpl(
  me: User,
  parentId: string | null,
  markdown: string,
  isAnonymous: boolean,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  const trimmed = markdown.trim();
  if (!trimmed) {
    throw generalBadRequestError("内容不能为空");
  }

  // authorId is always recorded (even for anonymous posts) so that authorId is
  // available to avoid sending notifications to the poster of anonymous posts.
  const authorId = me.id;

  let parent: ShudongPostModel | null = null;
  let rootQuestionId: string | null = null;
  if (parentId) {
    parent = await db.ShudongPost.findByPk(parentId, {
      attributes: shudongPostAttributes,
      transaction,
    });
    invariant(parent, "Parent post not found");
    rootQuestionId = await findRootQuestionId(parentId, transaction);

    // Must schedule before saving data. See the callee's comment.
    await scheduleNotificationBeforeSavingData(
      "ShudongResponse",
      rootQuestionId,
      transaction,
    );
  } else {
    // Notify global subscribers of new questions without auto-subscribing
    // them to it. All new questions share the same subject ID so that they
    // are batched into one notification. Must schedule before saving data.
    // See the callee's comment.
    await scheduleNotificationBeforeSavingData(
      "ShudongQuestion",
      shudongNewQuestionSubjectId,
      transaction,
    );
  }

  const post = await db.ShudongPost.create(
    {
      parentId,
      authorId,
      isAnonymous,
      markdown: trimmed,
    },
    { transaction },
  );

  if (parentId) {
    invariant(parent, "Parent post not found");
    // Increment response count on all ancestors in the parent chain so that
    // responseCount includes all direct and indirect responses.
    let currParentId: string | null = parentId;
    let incrementBy = 1;

    while (currParentId) {
      const parentPost: ShudongPostModel | null = await db.ShudongPost.findByPk(
        currParentId,
        {
          attributes: shudongPostAttributes,
          transaction,
        },
      );
      if (!parentPost) break;

      const wasHidden =
        parentPost.deletedAt !== null && parentPost.responseCount === 0;

      await parentPost.increment("responseCount", {
        by: incrementBy,
        transaction,
      });

      if (wasHidden) {
        incrementBy += 1;
      }

      currParentId = parentPost.parentId;
    }

    // Auto-subscribe responder to root question
    invariant(rootQuestionId, "rootQuestionId should be defined");
    await db.ShudongSubscription.findOrCreate({
      where: { questionId: rootQuestionId, userId: me.id },
      transaction,
    });
  } else {
    // Auto-subscribe poster to root question (global subscribers are notified
    // but not auto-subscribed).
    await db.ShudongSubscription.findOrCreate({
      where: { questionId: post.id, userId: me.id },
      transaction,
    });
  }

  const draftParentIdKey = parentId ?? "root";
  await db.DraftMessage.destroy({
    where: { shudongParentId: draftParentIdKey, authorId: me.id },
    transaction,
  });

  const fresh = await db.ShudongPost.findByPk(post.id, {
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });
  invariant(fresh, "Failed to reload created post");

  return await formatShudongPost(fresh, me.id, undefined, transaction);
}

/**
 * Updates a post's content and sets lastEditedAt to current timestamp.
 */
export async function updatePostImpl(
  me: User,
  postId: string,
  markdown: string,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  const post = await findShudongPostOrThrow(postId, transaction);

  if (!canEditOrDeleteShudongPost(me, post.authorId)) {
    throw noPermissionError("树洞帖子", postId);
  }

  const trimmed = markdown.trim();
  if (!trimmed) {
    throw generalBadRequestError("内容不能为空");
  }

  await post.update(
    {
      markdown: trimmed,
      lastEditedAt: new Date(),
    },
    { transaction },
  );

  await db.DraftMessage.destroy({
    where: { shudongPostId: postId, authorId: me.id },
    transaction,
  });

  const fresh = await db.ShudongPost.findByPk(post.id, {
    attributes: shudongPostAttributes,
    include: shudongPostInclude,
    transaction,
  });
  invariant(fresh, "Failed to reload updated post");

  return await formatShudongPost(fresh, me.id, undefined, transaction);
}

/**
 * Decrements response counts up the parent chain when a post becomes hidden
 * (i.e. soft-deleted with responseCount === 0). Cascades if soft-deleted
 * ancestors also become hidden.
 */
export async function handleNodeBecameHidden(
  postId: string,
  transaction: Transaction,
) {
  const post = await db.ShudongPost.findByPk(postId, {
    attributes: ["id", "parentId"],
    transaction,
  });
  if (!post || !post.parentId) return;

  let currParentId: string | null = post.parentId;
  let decrementBy = 1;

  while (currParentId) {
    const parent: ShudongPostModel | null = await db.ShudongPost.findByPk(
      currParentId,
      {
        attributes: shudongPostAttributes,
        transaction,
      },
    );
    if (!parent) break;

    await parent.increment("responseCount", {
      by: -decrementBy,
      transaction,
    });
    await parent.reload({ transaction });

    if (parent.deletedAt !== null && parent.responseCount === 0) {
      decrementBy += 1;
    }

    currParentId = parent.parentId;
  }
}

/**
 * Soft deletes a post (deletedAt = now).
 * Decrements ancestor responseCounts if this post becomes completely hidden.
 */
export async function deletePostImpl(
  me: User,
  postId: string,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  const post = await findShudongPostOrThrow(postId, transaction);

  if (!canEditOrDeleteShudongPost(me, post.authorId)) {
    throw noPermissionError("树洞帖子", postId);
  }

  await post.update(
    {
      deletedAt: new Date(),
    },
    { transaction },
  );

  // Decrement response count on ancestor posts only if this post will be completely hidden (responseCount === 0).
  // If responseCount > 0, this post stays in the thread as an anonymized soft-deleted placeholder.
  if (post.responseCount === 0) {
    await handleNodeBecameHidden(post.id, transaction);
  }
}

/**
 * Toggles an upvote on a post for the current user.
 */
export async function toggleUpvoteImpl(
  me: User,
  postId: string,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  const post = await findShudongPostOrThrow(postId, transaction);

  const existing = await db.ShudongUpvote.findOne({
    where: { postId, userId: me.id },
    transaction,
  });

  if (existing) {
    await existing.destroy({ transaction });
    await post.increment("upvoteCount", {
      by: -1,
      transaction,
    });
    await post.reload({ transaction });
    return { userHasUpvoted: false, upvoteCount: post.upvoteCount };
  } else {
    await db.ShudongUpvote.create({ postId, userId: me.id }, { transaction });
    await post.increment("upvoteCount", {
      by: 1,
      transaction,
    });
    await post.reload({ transaction });
    return { userHasUpvoted: true, upvoteCount: post.upvoteCount };
  }
}

/**
 * Toggles subscription to a Shudong question for the current user.
 */
export async function toggleSubscriptionImpl(
  me: User,
  questionId: string,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  const question = await findShudongPostOrThrow(questionId, transaction);
  invariant(question.parentId === null, "Can only subscribe to root questions");

  const existing = await db.ShudongSubscription.findOne({
    where: { questionId, userId: me.id },
    transaction,
  });

  if (existing) {
    await existing.destroy({ transaction });
    return { isSubscribed: false };
  } else {
    await db.ShudongSubscription.create(
      { questionId, userId: me.id },
      { transaction },
    );
    return { isSubscribed: true };
  }
}

/**
 * Saves a draft for a Shudong post.
 * shudongParentId is non-null when drafting a reply to a post.
 * shudongPostId is non-null when drafting an edit to an existing post.
 * One and only one of them must be non-null.
 */
export async function saveDraftImpl(
  me: User,
  shudongParentId: string | null,
  shudongPostId: string | null,
  markdown: string,
  transaction: Transaction,
) {
  checkShudongAccess(me);

  invariant(
    (shudongParentId === null) !== (shudongPostId === null),
    "one and only one of shudongParentId and shudongPostId must be specified",
  );

  const condition =
    shudongParentId !== null ? { shudongParentId } : { shudongPostId };

  const cnt = await db.DraftMessage.count({
    where: { authorId: me.id, ...condition },
    transaction,
  });

  if (cnt > 0) {
    await db.DraftMessage.update(
      { markdown },
      { where: { authorId: me.id, ...condition }, transaction },
    );
  } else {
    await db.DraftMessage.create(
      { authorId: me.id, ...condition, markdown },
      { transaction },
    );
  }
}

/**
 * Fetches saved draft content for a Shudong post.
 * shudongParentId is non-null when fetching draft for a reply to a post.
 * shudongPostId is non-null when fetching draft for editing an existing post.
 * One and only one of them must be non-null.
 */
export async function getDraftImpl(
  me: User,
  shudongParentId: string | null,
  shudongPostId: string | null,
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  invariant(
    (shudongParentId === null) !== (shudongPostId === null),
    "one and only one of shudongParentId and shudongPostId must be specified",
  );

  const condition =
    shudongParentId !== null ? { shudongParentId } : { shudongPostId };

  const draft = await db.DraftMessage.findOne({
    where: { authorId: me.id, ...condition },
    attributes: ["markdown"],
    transaction,
  });

  return draft ? draft.markdown : null;
}

const listQuestions = procedure
  .use(authUser())
  .input(
    z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
  )
  .output(z.array(zShudongPost))
  .query(async ({ ctx: { me }, input: { limit, offset } }) => {
    return await listQuestionsImpl(me, limit, offset);
  });

const getQuestion = procedure
  .use(authUser())
  .input(
    z.object({
      questionId: z.string(),
    }),
  )
  .output(
    z.object({
      question: zShudongPost,
      responses: z.array(zShudongPost),
    }),
  )
  .query(async ({ ctx: { me }, input: { questionId } }) => {
    return await getQuestionImpl(me, questionId);
  });

const getResponses = procedure
  .use(authUser())
  .input(
    z.object({
      parentId: z.string(),
    }),
  )
  .output(z.array(zShudongPost))
  .query(async ({ ctx: { me }, input: { parentId } }) => {
    return await getResponsesImpl(me, parentId);
  });

const createPost = procedure
  .use(authUser())
  .input(
    z.object({
      parentId: z.string().nullable(),
      markdown: z.string(),
      isAnonymous: z.boolean(),
    }),
  )
  .output(zShudongPost)
  .mutation(
    async ({ ctx: { me }, input: { parentId, markdown, isAnonymous } }) => {
      return await sequelize.transaction(async (t) => {
        return await createPostImpl(me, parentId, markdown, isAnonymous, t);
      });
    },
  );

const updatePost = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
      markdown: z.string(),
    }),
  )
  .output(zShudongPost)
  .mutation(async ({ ctx: { me }, input: { postId, markdown } }) => {
    return await sequelize.transaction(async (t) => {
      return await updatePostImpl(me, postId, markdown, t);
    });
  });

const deletePost = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { postId } }) => {
    await sequelize.transaction(async (t) => {
      await deletePostImpl(me, postId, t);
    });
  });

const toggleUpvote = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { postId } }) => {
    return await sequelize.transaction(async (t) => {
      return await toggleUpvoteImpl(me, postId, t);
    });
  });

const toggleSubscription = procedure
  .use(authUser())
  .input(
    z.object({
      questionId: z.string(),
    }),
  )
  .output(
    z.object({
      isSubscribed: z.boolean(),
    }),
  )
  .mutation(async ({ ctx: { me }, input: { questionId } }) => {
    return await sequelize.transaction(async (t) => {
      return await toggleSubscriptionImpl(me, questionId, t);
    });
  });

const saveDraft = procedure
  .use(authUser())
  .input(
    z.object({
      shudongParentId: z.string().nullable(),
      shudongPostId: z.string().nullable(),
      markdown: z.string(),
    }),
  )
  .mutation(
    async ({
      ctx: { me },
      input: { shudongParentId, shudongPostId, markdown },
    }) => {
      await sequelize.transaction(async (t) => {
        await saveDraftImpl(me, shudongParentId, shudongPostId, markdown, t);
      });
    },
  );

const getDraft = procedure
  .use(authUser())
  .input(
    z.object({
      shudongParentId: z.string().nullable(),
      shudongPostId: z.string().nullable(),
    }),
  )
  .output(z.string().nullable())
  .query(async ({ ctx: { me }, input: { shudongParentId, shudongPostId } }) => {
    return await getDraftImpl(me, shudongParentId, shudongPostId);
  });

export default router({
  listQuestions,
  getQuestion,
  getResponses,
  createPost,
  updatePost,
  deletePost,
  toggleUpvote,
  toggleSubscription,
  saveDraft,
  getDraft,
});
