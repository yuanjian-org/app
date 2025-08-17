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
import { zChatRoom } from "../../shared/ChatRoom";
import { Op, Transaction } from "sequelize";
import { zDateColumn, zNullableDateColumn } from "../../shared/DateColumn";
import moment from "moment";
import { scheduleEmail } from "./scheduledEmails";
import {
  checkRoomPermission,
  createChatMessage,
  findOrCreateRoom,
  findRoom,
} from "./chatsInternal";
import User from "shared/User";

const getRoom = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
    }),
  )
  .output(zChatRoom)
  .query(async ({ ctx, input: { menteeId } }) => {
    return await sequelize.transaction(async (transaction) => {
      return await findOrCreateRoom(ctx.user, menteeId, transaction);
    });
  });

/**
 * @return null if there is no message or corresponding chat room doesn't exist.
 */
const getLastMessageCreatedAt = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
      prefix: z.string(),
    }),
  )
  .output(zNullableDateColumn)
  .query(async ({ ctx: { user }, input: { menteeId, prefix } }) => {
    await checkRoomPermission(user, menteeId);

    return await sequelize.transaction(async (transaction) => {
      return await getLastMessageCreatedAtImpl(menteeId, prefix, transaction);
    });
  });

export async function getLastMessageCreatedAtImpl(
  menteeId: string,
  prefix: string,
  transaction: Transaction,
) {
  const room = await findRoom(menteeId, transaction);
  if (!room) return null;

  return await db.ChatMessage.max("createdAt", {
    where: {
      roomId: room.id,
      ...(prefix ? { markdown: { [Op.iLike]: `${prefix}%` } } : {}),
    },
    transaction,
  });
}

/**
 * @return excludes messages by the current user. null if there is no message or
 * corresponding chat room doesn't exist.
 */
const getLastMessageUpdatedAt = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
    }),
  )
  .output(zNullableDateColumn)
  .query(async ({ ctx: { user }, input: { menteeId } }) => {
    await checkRoomPermission(user, menteeId);

    return await sequelize.transaction(async (transaction) => {
      const room = await findRoom(menteeId, transaction);
      if (!room) return null;

      return await db.ChatMessage.max("updatedAt", {
        where: {
          roomId: room.id,
          userId: { [Op.ne]: user.id },
        },
        transaction,
      });
    });
  });

// No need to checkRoomPermission() because there is no harmful side effect
const getLastReadAt = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
    }),
  )
  .output(zDateColumn)
  .query(async ({ ctx: { user }, input: { menteeId } }) => {
    return await sequelize.transaction(async (transaction) => {
      const room = await findRoom(menteeId, transaction);
      if (!room) return moment(0);

      const l = await db.LastReadChatRoom.findOne({
        where: {
          roomId: room.id,
          userId: user.id,
        },
        attributes: ["lastReadAt"],
        transaction,
      });
      return l ? l.lastReadAt : moment(0);
    });
  });

// No need to checkRoomPermission() because there is no harmful side effect
const setLastReadAt = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
      lastReadAt: zDateColumn,
    }),
  )
  .mutation(async ({ ctx: { user }, input: { menteeId, lastReadAt } }) => {
    await sequelize.transaction(async (transaction) => {
      const room = await findRoom(menteeId, transaction);
      if (!room) throw notFoundError("讨论空间", menteeId);
      await db.LastReadChatRoom.upsert(
        {
          roomId: room.id,
          userId: user.id,
          lastReadAt,
        },
        { transaction },
      );
    });
  });

/**
 * Use mentorshipId etc to query instaed of using roomId, so that much logic of
 * this function can be deduped with `getRoom` and `getMostRecentMessageUpdatedAt`.
 */
const createMessage = procedure
  .use(authUser())
  .input(
    z.object({
      roomId: z.string(),
      markdown: z.string(),
    }),
  )
  .mutation(async ({ ctx: { user }, input: { roomId, markdown } }) => {
    await sequelize.transaction(async (transaction) => {
      await createMessageAndScheduleEmail(user, roomId, markdown, transaction);
    });
  });

export async function createMessageAndScheduleEmail(
  author: User,
  roomId: string,
  markdown: string,
  transaction: Transaction,
) {
  await createChatMessage(author, roomId, markdown, transaction);
  await scheduleEmail("Chat", roomId, transaction);
}

/**
 * Only the user who created the message can update it.
 */
const updateMessage = procedure
  .use(authUser())
  .input(
    z.object({
      messageId: z.string(),
      markdown: z.string(),
    }),
  )
  .mutation(async ({ ctx: { user }, input: { messageId, markdown } }) => {
    if (!markdown) throw generalBadRequestError("消息内容不能为空");

    await sequelize.transaction(async (transaction) => {
      const m = await db.ChatMessage.findByPk(messageId, {
        attributes: ["id", "userId", "roomId"],
        transaction,
      });
      if (!m) throw notFoundError("讨论消息", messageId);
      if (m.userId !== user.id) throw noPermissionError("讨论消息", messageId);

      await m.update({ markdown }, { transaction });

      await db.DraftChatMessage.destroy({
        where: { messageId, authorId: user.id },
        transaction,
      });

      await scheduleEmail("Chat", m.roomId, transaction);
    });
  });

// No need for permission check because there isn't harmful side effect.
const saveDraftMessage = procedure
  .use(authUser())
  .input(
    z.object({
      roomId: z.string().optional(),
      messageId: z.string().optional(),
      markdown: z.string(),
    }),
  )
  .mutation(
    async ({ ctx: { user }, input: { roomId, messageId, markdown } }) => {
      checkDraftMessageInput(roomId, messageId);

      // Sequelize's upsert() doesn't work well when there are multiple unique
      // constraints. So we do upsert manually.

      await sequelize.transaction(async (transaction) => {
        const condition = roomId === undefined ? { messageId } : { roomId };
        const cnt = await db.DraftChatMessage.count({
          where: {
            authorId: user.id,
            ...condition,
          },
          transaction,
        });
        if (cnt > 0) {
          await db.DraftChatMessage.update(
            { markdown },
            {
              where: condition,
              transaction,
            },
          );
        } else {
          await db.DraftChatMessage.create(
            {
              authorId: user.id,
              ...condition,
              markdown,
            },
            { transaction },
          );
        }
      });
    },
  );

// No need for permission check because there isn't harmful side effect.
const getDraftMessage = procedure
  .use(authUser())
  .input(
    z.object({
      roomId: z.string().optional(),
      messageId: z.string().optional(),
    }),
  )
  .output(z.string().nullable())
  .query(async ({ ctx: { user }, input: { roomId, messageId } }) => {
    checkDraftMessageInput(roomId, messageId);

    return (
      (
        await db.DraftChatMessage.findOne({
          where: {
            authorId: user.id,
            ...(roomId === undefined ? { messageId } : { roomId }),
          },
          attributes: ["markdown"],
        })
      )?.markdown ?? null
    );
  });

// See models/DraftChatMessage.ts for the explanation of roomId and messageId.
function checkDraftMessageInput(
  roomId: string | undefined,
  messageId: string | undefined,
) {
  if ((roomId === undefined) == (messageId === undefined)) {
    throw generalBadRequestError(
      "one and only one of roomId and messageId must be specified",
    );
  }
}

export default router({
  getRoom,
  createMessage,
  updateMessage,
  getLastMessageCreatedAt,
  getLastMessageUpdatedAt,
  getLastReadAt,
  setLastReadAt,
  saveDraftMessage,
  getDraftMessage,
});
