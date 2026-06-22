import db from "./src/api/database/db";
import sequelize from "./src/api/database/sequelize";
import { fn, col } from "sequelize";

async function listLastBatchFinalizedAtImpl(transaction?: any) {
  const rows = await db.MentorSelectionBatch.findAll({
    attributes: [
      "userId",
      [fn("COUNT", col("id")), "totalCount"],
      [fn("COUNT", col("finalizedAt")), "finalizedCount"],
      [fn("MAX", col("finalizedAt")), "maxFinalizedAt"],
    ],
    group: ["userId"],
    transaction,
  });

  return rows.map((row: any) => ({
    userId: row.userId,
    // When raw is false, aggregate columns usually go into `row.dataValues` or need `row.get('key')`
    finalizedAt:
      row.get("totalCount") === row.get("finalizedCount") ? row.get("maxFinalizedAt") : null,
  }));
}

async function run() {
  await sequelize.sync();
  const transaction = await sequelize.transaction();

  const mentee = await db.User.create({email: "mentee-raw-test2@test.com", roles: []}, { transaction });

  await db.MentorSelectionBatch.create(
    { userId: mentee.id, finalizedAt: null },
    { transaction },
  );
  await db.MentorSelectionBatch.create(
    { userId: mentee.id, finalizedAt: new Date("2024-02-01T00:00:00Z") },
    { transaction },
  );

  const result = await listLastBatchFinalizedAtImpl(transaction);
  console.log(result.find(r => r.userId === mentee.id));

  await transaction.rollback();
  process.exit(0);
}
run();
