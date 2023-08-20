import sequelizeInstance from "../src/api/database/sequelizeInstance";
import db from "../src/api/database/db";
import { Op } from "sequelize";

export default async function migrateData() {
  console.log("Migrating group.roles...");
  const gs: any = await db.Group.findAll({
    // @ts-ignore
    where: { roles: { [Op.eq]: null } },
  });
  console.log(`${gs.length} groups to be migrated`);
  for (const g of gs) await g.update({ roles: [] });

  // manual update column type
  await sequelizeInstance.query('alter table "InterviewFeedbackUpdateAttempts" alter column etag type BIGINT');
}
