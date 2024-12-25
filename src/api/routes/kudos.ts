import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import sequelize from "api/database/sequelize";
import db from "api/database/db";
import { generalBadRequestError, notFoundError } from "api/errors";
import { Op, Sequelize, Transaction } from "sequelize";
import { ScheduledEmailData, zScheduledKudosEmail } from "shared/ScheduledEmail";
import { kudosAttributes, kudosInclude } from "api/database/models/attributesAndIncludes";
import { zKudos } from "shared/Kudos";
import { zDateColumn } from "shared/DateColumn";

/**
 * List kudos for a user. If userId is not provided, list all kudos.
 * The return value is sorted by createdAt in descending order.
 */
const list = procedure
  .use(authUser("Volunteer"))
  .input(z.object({
    userId: z.string().optional(),
    limit: z.number().optional(),
  }))
  .output(z.array(zKudos))
  .query(async ({ input: { userId, limit } }) => 
{
  return await db.Kudos.findAll({
    where: userId ? { receiverId: userId } : undefined,
    attributes: kudosAttributes,
    include: kudosInclude,
    order: [['createdAt', 'DESC']],
    ...limit ? { limit } : {},
  });
});

/**
 * Get the createdAt of the newest kudos that were not sent by the user.
 */
const getNewestKudosCreatedAt = procedure
  .use(authUser("Volunteer"))
  .output(zDateColumn)
  .query(async ({ ctx: { user: me } }) => 
{
  const ret = await db.Kudos.max("createdAt", {
    where: { giverId: { [Op.ne]: me.id } },
  });
  return zDateColumn.parse(ret ?? "1970-01-01");
});

/**
 * Kudos with null text is a like.
 */
const create = procedure
  .use(authUser("Volunteer"))
  .input(z.object({
    userId: z.string(),
    text: z.string().nullable(),
  }))
  .mutation(async ({ ctx: { user: me }, input: { userId, text } }) =>
{
  if (userId === me.id) {
    throw generalBadRequestError("User cannot send kudos to themselves");
  }

  return await sequelize.transaction(async transaction => {
    await db.Kudos.create({
      receiverId: userId,
      giverId: me.id,
      text,
    }, { transaction });

    // Can't use db.User.increment because it doesn't support incrementing a
    // null field.
    const user = await db.User.findByPk(userId, { 
      attributes: ["id", "likes", "kudos"],
      transaction 
    });
    if (!user) throw notFoundError("用户", userId);

    await user.update({
      ...text === null ? { likes: user.likes + 1 } : { kudos: user.kudos + 1 },
    }, { transaction });

    await scheduleEmail(userId, transaction);
  });
});

// TODO: dedupe with chat.ts
async function scheduleEmail(receiverId: string, transaction: Transaction)
{
  // Force type check
  const type: z.TypeOf<typeof zScheduledKudosEmail.shape.type> = "Kudos";
  const typeKey: keyof typeof zScheduledKudosEmail.shape = "type";
  const receiverIdKey: keyof typeof zScheduledKudosEmail.shape = "receiverId";

  // For some reason `replacements` doesn't work here. So validate input
  // manually with zod parsing.
  const existing = await db.ScheduledEmail.count({
    where: Sequelize.literal(`
      data ->> '${typeKey}' = '${type}' AND
      data ->> '${receiverIdKey}' = '${z.string().uuid().parse(receiverId)}'
    `),
    transaction,
  });
  if (existing > 0) {
    console.log(`Kudos email already scheduled for ${receiverId}`);
    return;
  }

  const data: ScheduledEmailData = { type, receiverId };
  await db.ScheduledEmail.create({ data }, { transaction });
}

export default router({
  create,
  list,
  getNewestKudosCreatedAt,
});
