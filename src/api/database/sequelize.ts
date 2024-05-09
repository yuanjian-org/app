import { Sequelize } from "sequelize-typescript";
import apiEnv from "../apiEnv";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import db from "./db";

const sequelize = new Sequelize(apiEnv.DATABASE_URI, {
  models: Object.values(db),
  logging: false,
  dialectModule: require('pg'),
  retry: {
    // Error types: https://sequelize.org/api/v6/identifiers.html#errors
    match: [
      // Fix pg vercel bug: https://github.com/orgs/vercel/discussions/234
      /ConnectionError/
    ],
    max: 3
  }
});

export default sequelize;

hookIsPartialAfterSequelizeInit();

/**
 * Clean up db connection on exit, otherwise dangling connections after Vercel
 * kills the Serveless Functions may overwhelm our poor little db server.
 * 
 * It also makes sure tooling processes like "yarn test" & "yarn sync-database"
 * doesn't hang while waiting for connection closure.
 */
process.on('beforeExit', async () => {
  await sequelize.close();
});
