import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { 
  isValidPartnershipIds,
  zPartnership,
  zPartnershipWithAssessmentsDeprecated, 
  zPartnershipWithGroupAndNotes, 
  zPrivateMentorNotes } from "../../shared/Partnership";
import { z } from "zod";
import Assessment from "../database/models/Assessment";
import { alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import Group from "api/database/models/Group";
import { 
  mentorshipAttributes,
  groupAttributes,
  groupCountingTranscriptsInclude,
  mentorshipInclude, 
  mentorshipWithNotesAttributes,
  mentorshipWithGroupInclude,
  chatRoomAttributes,
  chatRoomInclude
} from "api/database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";
import { zChatRoom } from "shared/ChatRoom";
import User from "shared/User";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string(),
    menteeId: z.string(),
  }))
  .mutation(async ({ input: { mentorId, menteeId } }) => 
{
  if (!isValidPartnershipIds(menteeId, mentorId)) {
    throw generalBadRequestError('无效用户ID');
  }

  await sequelize.transaction(async transaction => {
    const mentor = await db.User.findByPk(mentorId, { lock: true, transaction });
    const mentee = await db.User.findByPk(menteeId, { lock: true, transaction });
    if (!mentor || !mentee) {
      throw generalBadRequestError('无效用户ID');
    }

    // Assign appropriate roles.
    mentor.roles = [...mentor.roles.filter(r => r != "Mentor"), "Mentor"];
    await mentor.save({ transaction });
    mentee.roles = [...mentee.roles.filter(r => r != "Mentee"), "Mentee"];
    await mentee.save({ transaction });

    let partnership;
    try {
      partnership = await db.Partnership.create({
        mentorId, menteeId
      }, { transaction });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }

    // Create groups
    invariant(partnership);
    await createGroup(null, [mentorId, menteeId], [], partnership.id, null, null, null, transaction);
  });
});

const updatePrivateMentorNotes = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    privateMentorNotes: zPrivateMentorNotes,
  }))
  .mutation(async ({ ctx, input }) => 
{
  const partnership = await db.Partnership.findByPk(input.id);
  if (!partnership || partnership.mentor.id !== ctx.user.id) {
    throw noPermissionError("一对一匹配", input.id);
  }

  partnership.privateMentorNotes = input.privateMentorNotes;
  partnership.save();
});

const list = procedure
  .use(authUser('PartnershipManager'))
  .output(z.array(zPartnershipWithGroupAndNotes))
  .query(async () => 
{
  return await db.Partnership.findAll({ 
    attributes: mentorshipWithNotesAttributes,
    include: mentorshipWithGroupInclude,
  });
});

const listMineAsCoach = procedure
  .use(authUser())
  .output(z.array(zPartnershipWithGroupAndNotes))
  .query(async ({ ctx }) =>
{
  return (await db.User.findAll({ 
    where: { coachId: ctx.user.id },
    attributes: [],
    include: [{
      association: "mentorshipsAsMentor",
      attributes: mentorshipWithNotesAttributes,
      include: mentorshipWithGroupInclude,
    }]
  })).map(u => u.mentorshipsAsMentor).flat();
});

const listMineAsMentor = procedure
  .use(authUser())
  .output(z.array(zPartnership))
  .query(async ({ ctx }) => 
{
  return await db.Partnership.findAll({
    where: { mentorId: ctx.user.id },
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  });
});

/**
 * Get all information of a partnership including private notes.
 * Only accessible by the mentor and mentor coaches
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zPartnershipWithGroupAndNotes)
  .query(async ({ ctx, input: id }) => 
{
  const res = await db.Partnership.findByPk(id, {
    attributes: mentorshipWithNotesAttributes,
    include: [...mentorshipInclude, {
      model: Group,
      attributes: groupAttributes,
      include: groupCountingTranscriptsInclude,
    }],
  });
  if (!res || (res.mentor.id !== ctx.user.id && !isPermitted(ctx.user.roles, "MentorCoach"))) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

// TODO: remove this function. Use partnership.get + assessments.listAllForMentorship instead.
const getWithAssessmentsDeprecated = procedure
  .use(authUser())
  .input(z.string())
  .output(zPartnershipWithAssessmentsDeprecated)
  .query(async ({ ctx, input: id }) =>
{
  const res = await db.Partnership.findByPk(id, {
    attributes: mentorshipAttributes,
    include: [
      ...mentorshipInclude,
      Assessment,
    ]
  });
  if (!res) throw notFoundError("一对一匹配", id);

  // Only assessors and mentors can access the partnership.
  if (!isPermitted(ctx.user.roles, 'PartnershipAssessor') && res.mentor.id !== ctx.user.id) {
    throw noPermissionError("一对一匹配", id);
  }

  return res;
});

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
  create,
  get,
  getWithAssessmentsDeprecated,
  list,
  listMineAsMentor,
  listMineAsCoach,
  updatePrivateMentorNotes,

  internalChat: router({
    getRoom,
    createMessage,
    updaateMessage,
  }),
});
