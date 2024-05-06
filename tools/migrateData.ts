import Role from "../src/shared/Role";
import db from "../src/api/database/db";
import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  // await sequelize.query('drop table if exists "ChatThreads"');

  await sequelize.transaction(async transaction => {
    console.log("Migrating role names...");
    const users = await db.User.findAll({
      attributes: ["id", "roles"],
      transaction
    });

    for (const u of users) {
      const roles: Role[] = u.roles.map(r => (
        r === "InterviewManager" ? "MenteeManager" :
        // r === "PartnershipAssessor" ? "MentorshipAssessor" :
        r
      ));
      await u.update({ roles }, { transaction });
    }

    console.log("Migrating chat rooms...");
    const mentorships = await db.Mentorship.findAll({
      attributes: ["id", "menteeId"],
      transaction
    });

    for (const m of mentorships) {
      // Ignore all but the first chat room if there are mulitple mentorships /
      // chatrooms associated with one user.
      if (await db.ChatRoom.count({ 
        where: { menteeId: m.menteeId },
        transaction
      }) == 0) {
        await sequelize.query(`
          update "ChatRooms" set "mentorshipId"=null, "menteeId"='${m.menteeId}'
          where "mentorshipId"='${m.id}'
        `, { transaction });
      }
    }
  });
}
