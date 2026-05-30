import { Sequelize } from "sequelize-typescript";
import { commonSequelizeConfig } from "./sequelizeConfig";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import db from "./db";

if (!process.env.DATABASE_URI) {
  throw new Error("DATABASE_URI is not set.");
}

const minPoolSize = process.env.DATABASE_MIN_POOL_SIZE
  ? parseInt(process.env.DATABASE_MIN_POOL_SIZE)
  : undefined;
const maxPoolSize = process.env.DATABASE_MAX_POOL_SIZE
  ? parseInt(process.env.DATABASE_MAX_POOL_SIZE)
  : undefined;

const sequelize = new Sequelize(process.env.DATABASE_URI, {
  ...commonSequelizeConfig(minPoolSize, maxPoolSize),
  models: Object.values(db),
});

hookIsPartialAfterSequelizeInit();

export default sequelize;
