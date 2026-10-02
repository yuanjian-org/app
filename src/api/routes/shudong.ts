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
import { features } from "../../shared/Features";
import ShudongPostModel from "../database/models/ShudongPost";
import { shudongPostInclude } from "../database/models/attributesAndIncludes";
import invariant from "shared/invariant";
import sequelize from "../database/sequelize";

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
 * Retrieves a post by PK and throws a notFoundError if missing or soft-deleted.
 */
export async function findShudongPostOrThrow(
  postId: string,
  transaction?: Transaction,
) {
  const post = await db.ShudongPost.findByPk(postId, {
    include: shudongPostInclude,
    transaction,
  });
  if (!post || post.deletedAt !== null) {
    throw notFoundError("树洞帖子", postId);
  }
  return post;
}

/**
 * Formats a raw DB ShudongPost for client consumption.
 * Anonymizes author info if the post is marked anonymous or soft-deleted.
 * Checks whether the current user has upvoted the post.
 */
export async function formatShudongPost(
  post: ShudongPostModel,
  myId: string,
  transaction?: Transaction,
): Promise<ShudongPost> {
  const upvote = await db.ShudongUpvote.findOne({
    where: { postId: post.id, userId: myId },
    attributes: ["userId"],
    transaction,
  });

  const isDeleted = post.deletedAt !== null;
  const isAnonymous = isDeleted || post.isAnonymous;
  const author = !isAnonymous && post.author ? post.author : null;

  return zShudongPost.parse({
    id: post.id,
    parentId: post.parentId,
    author,
    markdown: post.markdown,
    upvoteCount: post.upvoteCount,
    responseCount: post.responseCount,
    isDeleted,
    lastEditedAt: post.lastEditedAt,
    createdAt: post.createdAt,
    userHasUpvoted: !!upvote,
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
    include: shudongPostInclude,
    transaction,
  });

  const items: ShudongPost[] = [];
  for (const q of questions) {
    items.push(await formatShudongPost(q, me.id, transaction));
  }
  return items;
}

/**
 * Retrieves child responses for any parent post (response or sub-response).
 */
export async function getResponsesImpl(
  me: User,
  parentId: string,
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const responsesRaw = await db.ShudongPost.findAll({
    where: {
      parentId,
      ...shudongPostWhereCondition,
    },
    order: [["createdAt", "ASC"]],
    include: shudongPostInclude,
    transaction,
  });

  const responses: ShudongPost[] = [];
  for (const r of responsesRaw) {
    responses.push(await formatShudongPost(r, me.id, transaction));
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
    include: shudongPostInclude,
    transaction,
  });
  if (!q || (q.deletedAt !== null && q.responseCount === 0)) {
    throw notFoundError("树洞帖子", questionId);
  }

  const question = await formatShudongPost(q, me.id, transaction);
  const responses = await getResponsesImpl(me, questionId, transaction);

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

  let authorId: string | null = me.id;
  if (isAnonymous && !features.shudongRecordAnonymousUserId) {
    authorId = null;
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
    const parent = await db.ShudongPost.findByPk(parentId, { transaction });
    invariant(parent, "Parent post not found");
    await parent.increment("responseCount", { by: 1, transaction });
  }

  const draftParentIdKey = parentId ?? "root";
  await db.DraftMessage.destroy({
    where: { shudongParentId: draftParentIdKey, authorId: me.id },
    transaction,
  });

  const fresh = await db.ShudongPost.findByPk(post.id, {
    include: shudongPostInclude,
    transaction,
  });
  invariant(fresh, "Failed to reload created post");

  return await formatShudongPost(fresh, me.id, transaction);
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
    include: shudongPostInclude,
    transaction,
  });
  invariant(fresh, "Failed to reload updated post");

  return await formatShudongPost(fresh, me.id, transaction);
}

/**
 * Soft deletes a post (deletedAt = now).
 * Decrements parent responseCount if this is a response.
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

  // Decrement response count on parent post only if this post will be completely hidden (responseCount === 0).
  // If responseCount > 0, this post stays in the thread as an anonymized soft-deleted placeholder.
  if (post.parentId && post.responseCount === 0) {
    const parent = await db.ShudongPost.findByPk(post.parentId, {
      transaction,
    });
    invariant(
      parent && parent.responseCount > 0,
      "Parent post not found or responseCount invalid",
    );
    await parent.increment("responseCount", {
      by: -1,
      transaction,
    });
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
    invariant(post.upvoteCount > 0, "Upvote count must be greater than zero");
    await post.increment("upvoteCount", {
      by: -1,
      transaction,
    });
    return { userHasUpvoted: false, upvoteCount: post.upvoteCount - 1 };
  } else {
    await db.ShudongUpvote.create({ postId, userId: me.id }, { transaction });
    await db.ShudongPost.increment("upvoteCount", {
      by: 1,
      where: { id: postId },
      transaction,
    });
    return { userHasUpvoted: true, upvoteCount: post.upvoteCount + 1 };
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
  saveDraft,
  getDraft,
});
