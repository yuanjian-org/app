import sequelizeInstance from "../src/api/database/sequelizeInstance";
import db from "../src/api/database/db";
import { createGroupDeprecated, findGroups } from "../src/api/routes/groups";
import invariant from "tiny-invariant";

export default async function migrateData() {
  await migrateRoles();
  await migrateGroupsForPartnerships();
}

async function migrateRoles()
{
  console.log('Migrating users.roles column');
  await sequelizeInstance.query(`update users set roles = '[]' where roles = '["VISITOR"]'`);
  await sequelizeInstance.query(`update users set roles = '["UserManager"]' where roles = '["ADMIN"]'`);
  await sequelizeInstance.query(`update users set roles = '["SummaryEngineer"]' where roles = '["AIResearcher"]'`);
}

async function migrateGroupsForPartnerships()
{
  console.log('Migrating groups for partnerships');
  const partnerships = await db.Partnership.findAll({
    include: [db.Group],
  });
  for (const partnership of partnerships) {
    // Already have a group, all set.
    if (partnership.group) continue;

    const userIds = [partnership.menteeId, partnership.mentorId];
    const groups = await findGroups(userIds, "exclusive");
    invariant(groups.length <= 1);

    let g;

    if (groups.length) {
      // The group exists but isn't owned by the partnership.
      g = await db.Group.findByPk(groups[0].id);
    } else {
      // The group doesn't exist.
      console.log("Creating group");
      g = (await createGroupDeprecated(userIds)).group;
    }

    invariant(g);
    console.log(`Associating partnership ${partnership.id} and group ${g.id}`);
    g.partnershipId = partnership.id;
    await g.save();
  }
}
