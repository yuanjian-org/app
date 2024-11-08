import Role from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");
  await sequelize.sync({ alter: { drop: false } });

  console.log("Migrating DB data...");

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
    UPDATE "InterviewFeedbacks"
    SET feedback = jsonb_set(
      feedback,
      '{dimensions}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN value ->> 'name' = '远见价值' THEN jsonb_set(value, '{name}', '"导师价值"')
            ELSE value
          END
        )
        FROM jsonb_array_elements(feedback -> 'dimensions') AS value
      )
    )
    WHERE feedback -> 'dimensions' @> '[{"name":"远见价值"}]';
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

  await updateRolesColumnType();
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

// update roles column data type to array
async function updateRolesColumnType() {
  console.log("Updating User Table Roles column type...");

  const [results] = await sequelize.query(`
      SELECT pg_typeof(roles) AS role_type
      FROM users limit 1
  `);

  // If the column type is already varchar[], exit the function
  // @ts-ignore
  if (results.length > 0 && results[0].role_type === 'character varying[]') {
    console.log("The roles column is already of type varchar[]. No changes needed.");
    return; // Exit if no changes are needed
  }

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
        `ALTER TABLE users
            ADD COLUMN temp_roles varchar[] DEFAULT '{}';`,
        { transaction }
    );

    await sequelize.query(
        `UPDATE users
         SET temp_roles = (
             CASE
                 WHEN roles = '[]'::jsonb THEN '{}'::varchar[]
                 ELSE (
                     SELECT array_agg(elem)
                     FROM jsonb_array_elements_text(roles) AS elem
                 )
                 END
             );`,
        { transaction }
    );

    await sequelize.query(
        `ALTER TABLE users DROP COLUMN roles;`,
        { transaction }
    );

    await sequelize.query(
        `ALTER TABLE users RENAME COLUMN temp_roles TO roles;`,
        { transaction }
    );
  });
}