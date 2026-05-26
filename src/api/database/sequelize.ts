import { Sequelize } from "sequelize-typescript";
import { commonSequelizeConfig } from "./sequelizeConfig";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import db from "./db";

if (!process.env.DATABASE_URI) {
  throw new Error("DATABASE_URI is not set.");
}

const sequelize = new Sequelize(process.env.DATABASE_URI, {
  ...commonSequelizeConfig,
  models: Object.values(db),
});

hookIsPartialAfterSequelizeInit();

export default sequelize;
