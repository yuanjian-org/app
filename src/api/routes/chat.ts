import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import { 
  mentorshipAttributes,
  mentorshipInclude, 
  chatRoomAttributes,
  chatRoomInclude
} from "api/database/models/attributesAndIncludes";
import { zChatRoom } from "shared/ChatRoom";
import User from "shared/User";

const getRoom = procedure
  .use(authUser())
  .input(z.object({
    mentorshipId: z.string(),
  }))
  .output(zChatRoom)
  .query(async ({ ctx, input: { mentorshipId } }) =>
{
  while (true) {
    const r = await db.ChatRoom.findOne({
      where: { mentorshipId },
      attributes: chatRoomAttributes,
      include: [...chatRoomInclude, {
        association: "mentorship",
        attributes: mentorshipAttributes,
        include: mentorshipInclude,
      }],
    });

    if (!r) {
      await db.ChatRoom.create({ mentorshipId });
      continue;
    }

    if (r.mentorship) checkChatRoomPermission(ctx.user, r.mentorship.mentor.id);
    return r;
  }
});

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
      attributes: [],
      include: [{
        association: "mentorship",
        attributes: mentorshipAttributes,
        include: mentorshipInclude,
      }],
    });
    if (!r) throw notFoundError("讨论空间", roomId);

    if (r.mentorship) checkChatRoomPermission(ctx.user, r.mentorship.mentor.id);

    await db.ChatMessage.create({ roomId, markdown, userId: ctx.user.id }, { transaction });
  });
});

/**
 * Only the user who created the message can update it
 */
const updaateMessage = procedure
  .use(authUser())
  .input(z.object({
    messageId: z.string(),
    markdown: z.string(),
  }))
  .mutation(async ({ ctx, input: { messageId, markdown } }) => 
{
  if (!markdown) throw generalBadRequestError("消息内容不能为空");

  await sequelize.transaction(async transaction => {
    const m = await db.ChatMessage.findByPk(messageId, {
      attributes: ["id", "userId"],
    });
    if (!m) throw notFoundError("讨论消息", messageId);
    if (m.userId !== ctx.user.id) throw noPermissionError("讨论消息", messageId);
    await m.update({ markdown });
  });
});

function checkChatRoomPermission(me: User, mentorId: string) {
  if (!isPermitted(me.roles, "MentorCoach") && me.id !== mentorId) throw noPermissionError("讨论空间");
}

export default router({
  getRoom,
  createMessage,
  updaateMessage,
});
