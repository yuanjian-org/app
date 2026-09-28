import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import User from "shared/User";
import {
  canAccessShudong,
  canEditOrDeleteShudongPost,
} from "../../shared/ShudongPermissions";
import { zShudongPost, ShudongPost } from "../../shared/Shudong";
import { features } from "../../shared/Features";

export function checkShudongAccess(me: User) {
  if (!canAccessShudong(me)) {
    throw noPermissionError("树洞");
  }
}

export async function formatShudongPost(
  post: any,
  meId: string,
  transaction?: Transaction,
): Promise<ShudongPost> {
  const upvote = await db.ShudongUpvote.findOne({
    where: { postId: post.id, userId: meId },
    attributes: ["id"],
    transaction,
  });

  const author =
    !post.isAnonymous && post.author
      ? { id: post.author.id, name: post.author.name, url: post.author.url }
      : null;

  return zShudongPost.parse({
    id: post.id,
    parentId: post.parentId,
    author,
    isAnonymous: post.isAnonymous,
    markdown: post.markdown,
    upvoteCount: post.upvoteCount,
    responseCount: post.responseCount,
    isEdited: post.isEdited,
    isDeleted: post.isDeleted,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    userHasUpvoted: !!upvote,
  });
}

export async function listQuestionsImpl(
  me: User,
  input: { limit?: number; offset?: number },
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;

  const questions = await db.ShudongPost.findAll({
    where: { parentId: null, isDeleted: false },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });

  const items: ShudongPost[] = [];
  for (const q of questions) {
    items.push(await formatShudongPost(q, me.id, transaction));
  }
  return items;
}

export async function getQuestionImpl(
  me: User,
  input: { questionId: string },
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const q = await db.ShudongPost.findByPk(input.questionId, {
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });
  if (!q || q.isDeleted) {
    throw notFoundError("树洞帖子", input.questionId);
  }

  const question = await formatShudongPost(q, me.id, transaction);

  const responsesRaw = await db.ShudongPost.findAll({
    where: { parentId: input.questionId, isDeleted: false },
    order: [["createdAt", "ASC"]],
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });

  const responses: ShudongPost[] = [];
  for (const r of responsesRaw) {
    responses.push(await formatShudongPost(r, me.id, transaction));
  }

  return { question, responses };
}

export async function getResponsesImpl(
  me: User,
  input: { parentId: string },
  transaction?: Transaction,
) {
  checkShudongAccess(me);
  const responsesRaw = await db.ShudongPost.findAll({
    where: { parentId: input.parentId, isDeleted: false },
    order: [["createdAt", "ASC"]],
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });

  const responses: ShudongPost[] = [];
  for (const r of responsesRaw) {
    responses.push(await formatShudongPost(r, me.id, transaction));
  }
  return responses;
}

export async function createPostImpl(
  me: User,
  input: { parentId?: string | null; markdown: string; isAnonymous?: boolean },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const trimmed = input.markdown.trim();
  if (!trimmed) {
    throw generalBadRequestError("内容不能为空");
  }

  const parentId = input.parentId ?? null;
  const defaultIsAnonymous = parentId === null;
  const isAnonymous = input.isAnonymous ?? defaultIsAnonymous;

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
      upvoteCount: 0,
      responseCount: 0,
      isEdited: false,
      isDeleted: false,
    },
    { transaction },
  );

  if (parentId) {
    const parent = await db.ShudongPost.findByPk(parentId, { transaction });
    if (parent) {
      await parent.increment("responseCount", { by: 1, transaction });
    }
  }

  const draftParentIdKey = parentId ?? "root";
  await db.DraftMessage.destroy({
    where: { shudongParentId: draftParentIdKey, authorId: me.id },
    transaction,
  });

  const fresh = await db.ShudongPost.findByPk(post.id, {
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });

  return await formatShudongPost(fresh, me.id, transaction);
}

export async function updatePostImpl(
  me: User,
  input: { postId: string; markdown: string },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const post = await db.ShudongPost.findByPk(input.postId, { transaction });
  if (!post || post.isDeleted) {
    throw notFoundError("树洞帖子", input.postId);
  }

  if (!canEditOrDeleteShudongPost(me, post.authorId)) {
    throw noPermissionError("树洞帖子", input.postId);
  }

  const trimmed = input.markdown.trim();
  if (!trimmed) {
    throw generalBadRequestError("内容不能为空");
  }

  await post.update(
    {
      markdown: trimmed,
      isEdited: true,
    },
    { transaction },
  );

  await db.DraftMessage.destroy({
    where: { shudongPostId: input.postId, authorId: me.id },
    transaction,
  });

  const fresh = await db.ShudongPost.findByPk(post.id, {
    include: [{ association: "author", attributes: ["id", "name", "url"] }],
    transaction,
  });

  return await formatShudongPost(fresh, me.id, transaction);
}

export async function deletePostImpl(
  me: User,
  input: { postId: string },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const post = await db.ShudongPost.findByPk(input.postId, { transaction });
  if (!post || post.isDeleted) {
    throw notFoundError("树洞帖子", input.postId);
  }

  if (!canEditOrDeleteShudongPost(me, post.authorId)) {
    throw noPermissionError("树洞帖子", input.postId);
  }

  await post.update(
    {
      isDeleted: true,
      deletedAt: new Date(),
    },
    { transaction },
  );

  if (post.parentId) {
    const parent = await db.ShudongPost.findByPk(post.parentId, {
      transaction,
    });
    if (parent && parent.responseCount > 0) {
      await parent.decrement("responseCount", { by: 1, transaction });
    }
  }

  return { success: true };
}

export async function toggleUpvoteImpl(
  me: User,
  input: { postId: string },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const post = await db.ShudongPost.findByPk(input.postId, { transaction });
  if (!post || post.isDeleted) {
    throw notFoundError("树洞帖子", input.postId);
  }

  const existing = await db.ShudongUpvote.findOne({
    where: { postId: input.postId, userId: me.id },
    transaction,
  });

  if (existing) {
    await existing.destroy({ transaction });
    if (post.upvoteCount > 0) {
      await post.decrement("upvoteCount", { by: 1, transaction });
    }
    await post.reload({ transaction });
    return { userHasUpvoted: false, upvoteCount: post.upvoteCount };
  } else {
    await db.ShudongUpvote.create(
      { postId: input.postId, userId: me.id },
      { transaction },
    );
    await post.increment("upvoteCount", { by: 1, transaction });
    await post.reload({ transaction });
    return { userHasUpvoted: true, upvoteCount: post.upvoteCount };
  }
}

export async function saveDraftImpl(
  me: User,
  input: {
    shudongParentId?: string | null;
    shudongPostId?: string | null;
    markdown: string;
  },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const { shudongParentId, shudongPostId, markdown } = input;
  if ((shudongParentId === undefined) === (shudongPostId === undefined)) {
    throw generalBadRequestError(
      "one and only one of shudongParentId and shudongPostId must be specified",
    );
  }

  const condition =
    shudongParentId !== undefined ? { shudongParentId } : { shudongPostId };

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

  return { success: true };
}

export async function getDraftImpl(
  me: User,
  input: { shudongParentId?: string | null; shudongPostId?: string | null },
  transaction?: Transaction,
) {
  checkShudongAccess(me);

  const { shudongParentId, shudongPostId } = input;
  if ((shudongParentId === undefined) === (shudongPostId === undefined)) {
    throw generalBadRequestError(
      "one and only one of shudongParentId and shudongPostId must be specified",
    );
  }

  const condition =
    shudongParentId !== undefined ? { shudongParentId } : { shudongPostId };

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
  .query(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await listQuestionsImpl(me, input, t);
    });
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
  .query(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await getQuestionImpl(me, input, t);
    });
  });

const getResponses = procedure
  .use(authUser())
  .input(
    z.object({
      parentId: z.string(),
    }),
  )
  .output(z.array(zShudongPost))
  .query(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await getResponsesImpl(me, input, t);
    });
  });

const createPost = procedure
  .use(authUser())
  .input(
    z.object({
      parentId: z.string().nullable().optional(),
      markdown: z.string(),
      isAnonymous: z.boolean().optional(),
    }),
  )
  .output(zShudongPost)
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await createPostImpl(me, input, t);
    });
  });

const updatePost = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
      markdown: z.string(),
    }),
  )
  .output(zShudongPost)
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await updatePostImpl(me, input, t);
    });
  });

const deletePost = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await deletePostImpl(me, input, t);
    });
  });

const toggleUpvote = procedure
  .use(authUser())
  .input(
    z.object({
      postId: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await toggleUpvoteImpl(me, input, t);
    });
  });

const saveDraft = procedure
  .use(authUser())
  .input(
    z.object({
      shudongParentId: z.string().nullable().optional(),
      shudongPostId: z.string().nullable().optional(),
      markdown: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await saveDraftImpl(me, input, t);
    });
  });

const getDraft = procedure
  .use(authUser())
  .input(
    z.object({
      shudongParentId: z.string().nullable().optional(),
      shudongPostId: z.string().nullable().optional(),
    }),
  )
  .output(z.string().nullable())
  .query(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (t) => {
      return await getDraftImpl(me, input, t);
    });
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
