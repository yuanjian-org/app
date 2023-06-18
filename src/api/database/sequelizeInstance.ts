import { Sequelize } from "sequelize-typescript";
import User from "./models/User";
import apiEnv from "../apiEnv";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";

const sequelizeInstance = new Sequelize(apiEnv.DATABASE_URI, {
  models: [User, Group, GroupUser],

  // fix pg vercel bug
  // https://github.com/orgs/vercel/discussions/234
  dialectModule: require('pg'),
  retry: {
    match: [
      /ConnectionError/
    ],
    max: 3
}
});

hookIsPartialAfterSequelizeInit();

export default sequelizeInstance;
