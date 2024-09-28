import Role from "../src/shared/Role";
import db from "../src/api/database/db";
import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Calibrations_name_key'
      ) THEN
        ALTER TABLE "Calibrations"
        DROP CONSTRAINT "Calibrations_name_key";
      END IF;
    END $$;    
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Calibrations_id_type'
      ) THEN
        ALTER TABLE "Calibrations"
        DROP CONSTRAINT "Calibrations_id_type";
      END IF;
    END $$;    
  `);


  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Calibrations_name_type'
      ) THEN
        ALTER TABLE "Calibrations"
        ADD CONSTRAINT "Calibrations_name_type" UNIQUE (name, type);
      END IF;
    END $$;
  `);

  await sequelize.transaction(async transaction => {
    console.log("Migrating role names...");
    const users = await db.User.findAll({
      attributes: ["id", "roles"],
      transaction
    });

    for (const u of users) {
      if (!u.roles.includes("MenteeManager")) continue;
      const roles: Role[] = [...u.roles.filter(r => r !== "MenteeManager"),
        "MentorshipManager"];
      await u.update({ roles }, { transaction });
    }
  });

  await cleanupFeedbackAttempLog();

  await updateMenteeStatus();
}

async function cleanupFeedbackAttempLog() {
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}

// update mentee status
async function updateMenteeStatus() {
  console.log("Updating mentee status...");

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
        `UPDATE Users SET "menteeStatus" = '面拒' WHERE "menteeStatus" = '面据'`,
        { transaction }
    );

    await sequelize.query(
        `UPDATE Users SET "menteeStatus" = '初拒' WHERE "menteeStatus" = '初据'`,
        { transaction }
    );
  });
}