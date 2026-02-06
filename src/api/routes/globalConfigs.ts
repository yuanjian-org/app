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

      const existingData = row ? zGlobalConfig.parse(row.data) : {};
      const newData = { ...existingData };

      // Update fields based on input
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined) {
          // Skip undefined values - don't change existing
          continue;
        } else if (value === false && key === "showEditMessageTimeButton") {
          // Remove the field when explicitly set to false
          delete newData[key as keyof typeof newData];
        } else {
          // Set the value for all other cases
          (newData as any)[key] = value;
        }
      }

      if (!row) {
        await db.GlobalConfig.create({ data: newData }, { transaction });
      } else {
        await row.update({ data: newData }, { transaction });
      }
    });
  });

export default router({
  get,
  update,
});
