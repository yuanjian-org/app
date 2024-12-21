import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import { Op } from "sequelize";
import _ from "lodash";
import invariant from "tiny-invariant";
import { softTraitPrefAbsValue } from "../../shared/Traits";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await cleanupLogs();
}

async function cleanupLogs() {
  console.log("Clean up old logs...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
  `);
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}

function migrateSchema() {
  console.log("Migrating DB schema...");
}

async function migrateData() {
  console.log("Migrating DB data...");

  await sequelize.transaction(async transaction => {
    const users = await db.User.findAll({
      where: { [Op.not]: { preference: null } },
      attributes: ['id', 'preference'],
      transaction,
    });

    for (const user of users) {
      const p = user.preference;
      const traits = p?.mentor?.学生特质;
      if (traits) {
        const traits2 = _.cloneDeep(traits);
        for (const [k, v] of Object.entries(traits2)) {
          // @ts-expect-error
          if (v === 2) traits2[k] = softTraitPrefAbsValue;
          // @ts-expect-error
          if (v === -2) traits2[k] = -softTraitPrefAbsValue;
        }

        const p2 = _.cloneDeep(p);
        invariant(p2 && p2.mentor);
        p2.mentor.学生特质 = traits2;
        await user.update({ preference: p2 }, { transaction });
      }
    }
  });
}
