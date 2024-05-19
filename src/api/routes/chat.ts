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
import { checkPermissionForMentee } from "./users";
import invariant from "tiny-invariant";

const getRoom = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string(),
  }))
  .output(zChatRoom)
  .query(async ({ ctx, input: { menteeId } }) =>
{
  while (true) {
    const r = await db.ChatRoom.findOne({
      where: { menteeId },
      attributes: chatRoomAttributes,
      include: chatRoomInclude,
    });

    if (!r) {
      await db.ChatRoom.create({ menteeId });
      continue;
    }

    await checkRoomPermission(ctx.user, menteeId);
    return r;
  }
});

/**
 * @return null if there is no message or corresponding chat room doesn't exist.
 */
const getMostRecentMessageUpdatedAt = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string(),
  }))
  .output(z.date().nullable())
  .query(async ({ ctx, input: { menteeId } }) =>
{
  const r = await db.ChatRoom.findOne({
    where: { menteeId },
    attributes: ["id"],
  });
  if (!r) return null;

  await checkRoomPermission(ctx.user, menteeId);

  return await db.ChatMessage.max("updatedAt", { where: { roomId: r.id } });
});

/**
 * Use mentorshipId etc to query instaed of using roomId, so that much logic of this function can be deduped with
 * `getRoom` and `getMostRecentMessageUpdatedAt`
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
      attributes: ["id", "userId"],
      transaction,
    });
    if (!m) throw notFoundError("讨论消息", messageId);
    if (m.userId !== ctx.user.id) throw noPermissionError("讨论消息", messageId);
    await m.update({ markdown }, { transaction });
  });
});

async function checkRoomPermission(me: User, menteeId: string | null) {
  if (menteeId !== null) await checkPermissionForMentee(me, menteeId);
  else invariant(false);
}

export default router({
  getRoom,
  createMessage,
  updateMessage,
  getMostRecentMessageUpdatedAt,
});
