import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { zGlobalConfig, GlobalConfig } from "shared/GlobalConfig";
import sequelize from "../database/sequelize";
import { isDemo as isDemoFlag } from "../../shared/isDemo";
import { z } from "zod";
import { Transaction } from "sequelize";

export function getStaticImpl() {
  return {
    isDemo: isDemoFlag(),
    enableOrgs: process.env.ENABLE_ORGS === "true",
    whiteLabel: process.env.WHITE_LABEL,
  };
}

export async function getImpl(transaction?: Transaction) {
  const row = await db.GlobalConfig.findOne({
    attributes: ["data"],
    transaction,
  });
  return row?.data ?? {};
}

export async function updateImpl(
  input: Partial<GlobalConfig>,
  transaction: Transaction,
) {
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
}

/**
 * This route only includes configs that never change during runtime,
 * allowing clients to cache query results aggressively.
 */
const getStatic = procedure
  .output(
    z.object({
      isDemo: z.boolean(),
      enableOrgs: z.boolean(),
      whiteLabel: z.string().optional(),
    }),
  )
  .query(() => {
    return getStaticImpl();
  });

const get = procedure
  .use(authUser())
  .output(zGlobalConfig)
  .query(async () => {
    return await getImpl();
  });

const update = procedure
  .use(authUser("MentorshipManager"))
  .input(zGlobalConfig.partial())
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (transaction) => {
      await updateImpl(input, transaction);
    });
  });

export default router({
  getStatic,
  get,
  update,
});
