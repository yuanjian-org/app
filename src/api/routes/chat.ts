import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import {
  chatRoomAttributes,
  chatRoomInclude,
} from "api/database/models/attributesAndIncludes";
import { zChatRoom } from "shared/ChatRoom";
import User from "shared/User";
import { checkPermissionToAccessMentee } from "./users";
import invariant from "tiny-invariant";
import { Op, Sequelize, Transaction } from "sequelize";
import { zNullableDateColumn } from "shared/DateColumn";
import { ScheduledEmailData, zScheduledChatEmail } from "shared/ScheduledEmail";

const getRoom = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string(),
  }))
  .output(zChatRoom)
  .query(async ({ ctx, input: { menteeId } }) =>
{
  await checkRoomPermission(ctx.user, menteeId);

  return await sequelize.transaction(async transaction => {
    while (true) {
      const r = await db.ChatRoom.findOne({
        where: { menteeId },
        attributes: chatRoomAttributes,
        include: chatRoomInclude,
        transaction,
      });

      if (!r) {
        await db.ChatRoom.create({ menteeId }, { transaction });
      } else {
        return r;
      }
    }
  });
});

/**
 * @return null if there is no message or corresponding chat room doesn't exist.
 */
const getNewestMessageCreatedAt = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string(),
    prefix: z.string(),
  }))
  .output(zNullableDateColumn)
  .query(async ({ ctx, input: { menteeId, prefix } }) =>
{
  await checkRoomPermission(ctx.user, menteeId);

  return await sequelize.transaction(async transaction => {
    const r = await db.ChatRoom.findOne({
      where: { menteeId },
      attributes: ["id"],
      transaction,
    });
    if (!r) return null;

    return await db.ChatMessage.max("createdAt", { where: {
      roomId: r.id,
      markdown: { [Op.iLike]: `${prefix}%` },
    }, transaction });
  });
});

/**
 * Use mentorshipId etc to query instaed of using roomId, so that much logic of
 * this function can be deduped with `getRoom` and `getMostRecentMessageUpdatedAt`.
 */
const createMessage = procedure
  .use(authUser())
  .input(z.object({
    roomId: z.string(),
    markdown: z.string(),
  }))
  .mutation(async ({ ctx, input: { roomId, markdown } }) => 
{
  await sequelize.transaction(async transaction => {
    const r = await db.ChatRoom.findByPk(roomId, {
      attributes: ["menteeId"],
    });
    if (!r) throw notFoundError("讨论空间", roomId);

    await checkRoomPermission(ctx.user, r.menteeId);

    await db.ChatMessage.create({ roomId, markdown, userId: ctx.user.id },
      { transaction });

    await scheduleEmail(roomId, transaction);
  });
});

/**
 * Only the user who created the message can update it
 */
const updateMessage = procedure
  .use(authUser())
  .input(z.object({
    messageId: z.string(),
    markdown: z.string(),
  }))
  .mutation(async ({ ctx, input: { messageId, markdown } }) => 
{
  if (!markdown) throw generalBadRequestError("消息内容不能为空");

  await sequelize.transaction(async (transaction) => {
    const m = await db.ChatMessage.findByPk(messageId, {
      attributes: ["id", "userId", "roomId"],
      transaction,
    });
    if (!m) throw notFoundError("讨论消息", messageId);
    if (m.userId !== ctx.user.id) throw noPermissionError("讨论消息", messageId);
    await m.update({ markdown }, { transaction });

    await scheduleEmail(m.roomId, transaction);
  });
});

// TODO: dedupe with kudos.ts
async function scheduleEmail(roomId: string, transaction: Transaction) {
  // Force type check
  const type: z.TypeOf<typeof zScheduledChatEmail.shape.type> = "Chat";
  const typeKey: keyof typeof zScheduledChatEmail.shape = "type";
  const roomIdKey: keyof typeof zScheduledChatEmail.shape = "roomId";

  // For some reason `replacements` doesn't work here. So validate input
  // manually with zod parsing.
  const existing = await db.ScheduledEmail.count({
    where: Sequelize.literal(`
      data ->> '${typeKey}' = '${type}' AND
      data ->> '${roomIdKey}' = '${z.string().uuid().parse(roomId)}'
    `),
    transaction,
  });
  if (existing > 0) {
    console.log(`Chat email already scheduled for ${roomId}`);
    return;
  }

  const data: ScheduledEmailData = { type, roomId };
  await db.ScheduledEmail.create({ data }, { transaction });
}

async function checkRoomPermission(me: User, menteeId: string | null) {
  if (menteeId !== null) await checkPermissionToAccessMentee(me, menteeId);
  else invariant(false);
}

export default router({
  getRoom,
  createMessage,
  updateMessage,
  getNewestMessageCreatedAt,
});
