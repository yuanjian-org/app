import { Sequelize } from "sequelize-typescript";
import apiEnv from "../apiEnv";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import db from "./db";
//try to use import pg to fix require('pg') error here but it will need to run yarn add --dev @types/pg, so just disable this rule locally

const sequelize = new Sequelize(apiEnv.DATABASE_URI, {
  models: Object.values(db),
  logging: false,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  dialectModule: require('pg'),

  retry: {
    // Error types: https://sequelize.org/api/v6/identifiers.html#errors
    match: [
      /ConnectionError/   // Fix pg vercel bug: https://github.com/orgs/vercel/discussions/234
    ],
    max: 3
  },

  pool: {
    max: parseInt(process.env.DATABASE_MAX_POOL_SIZE ?? '5'),
    min: parseInt(process.env.DATABASE_MIN_POOL_SIZE ?? '0'),
  },
});

hookIsPartialAfterSequelizeInit();

export default sequelize;
