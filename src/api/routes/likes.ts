import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import sequelize from "api/database/sequelize";
import db from "api/database/db";
import { zLike } from "shared/Like";
import { likeAttributes, likeInclude } from "api/database/models/attributesAndIncludes";
import { generalBadRequestError } from "api/errors";
import { Sequelize, Transaction } from "sequelize";
import { ScheduledEmailData, zScheduledLikeEmailData } from "shared/ScheduledEmail";

const get = procedure
  // TODO: Remove Mentee after the like UI componenet is encapsulated
  .use(authUser(["Volunteer", "Mentee"]))
  .input(z.object({
    userId: z.string(),
  }))
  .output(z.array(zLike))
  .query(async ({ input: { userId } }) => 
{
  return await db.Like.findAll({
    where: { userId },
    attributes: likeAttributes,
    include: likeInclude,
  });
});

const increment = procedure
  .use(authUser("Volunteer"))
  .input(z.object({
    userId: z.string(),
  }))
  .mutation(async ({ ctx: { user }, input: { userId } }) =>
{
  if (userId === user.id) {
    throw generalBadRequestError("User cannot like themselves");
  }

  return await sequelize.transaction(async transaction => {
    
    await scheduleEmail(userId, transaction);

    const row = await db.Like.findOne({
      where: { userId, likerId: user.id },
      attributes: ["id", "count"],
      transaction,
    });

    if (row) {
      await row.update({ count: row.count + 1 }, { transaction });
    } else {
      await db.Like.create({
        userId,
        likerId: user.id,
        count: 1,
      },
      { transaction },
      );
    }
  });
});

async function scheduleEmail(userId: string, transaction: Transaction) {

  // Check if an email for the user has already been scheduled.
  const type: z.TypeOf<typeof zScheduledLikeEmailData.shape.type> = "Like";

  // For some reason `replacements` doesn't work here. So validate input
  // manually with zod parsing.
  const existing = await db.ScheduledEmail.count({
    where: Sequelize.literal(`
      data ->> 'type' = '${type}'
      AND data ->> 'userId' = '${z.string().uuid().parse(userId)}'
    `),
    transaction,
  });

  if (existing > 0) {
    console.log(`Like email already scheduled for ${userId}`);
    return;
  }

  const likes = await db.Like.findAll({
    where: { userId },
    attributes: ["likerId", "count"],
    transaction,
  });

  const data: ScheduledEmailData = {
    type: "Like",
    userId,
    before: likes.map(like => ({ likerId: like.likerId, count: like.count })),
  };

  await db.ScheduledEmail.create({ data }, { transaction });
}

export default router({
  increment,
  get,
});
