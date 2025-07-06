import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { zGlobalConfig } from "shared/GlobalConfig";
import sequelize from "../database/sequelize";

const get = procedure
  .use(authUser())
  .output(zGlobalConfig)
  .query(async () => {
    const row = await db.GlobalConfig.findOne({ attributes: ["data"] });
    return row?.data ?? {};
  });

const update = procedure
  .use(authUser("MentorshipManager"))
  .input(zGlobalConfig.partial())
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (transaction) => {
      const row = await db.GlobalConfig.findOne({
        attributes: ["id", "data"],
        transaction,
        lock: true,
      });
      if (!row) {
        await db.GlobalConfig.create({ data: input }, { transaction });
      } else {
        await row.update(
          {
            data: { ...zGlobalConfig.parse(row.data), ...input },
          },
          { transaction },
        );
      }
    });
  });

export default router({
  get,
  update,
});
