import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import sequelize from "api/database/sequelize";
import db from "api/database/db";
import { zLike } from "shared/Like";
import { likeAttributes, likeInclude } from "api/database/models/attributesAndIncludes";
import { generalBadRequestError } from "api/errors";

const get = procedure
  .use(authUser("Volunteer"))
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

export default router({
  increment,
  get,
});
