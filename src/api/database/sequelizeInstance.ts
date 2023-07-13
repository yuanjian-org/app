import { Sequelize } from "sequelize-typescript";
import apiEnv from "../apiEnv";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Transcript from "./models/Transcript";
import Summary from "./models/Summary";
import OngoingMeetings from "./models/OngoingMeetings";
import db from "./db";

const sequelizeInstance = new Sequelize(apiEnv.DATABASE_URI, {
  models: Object.values(db),
  logging: false,
  dialectModule: require('pg'),
  retry: {
    // Error types: https://sequelize.org/api/v6/identifiers.html#errors
    match: [
      /ConnectionError/   // Fix pg vercel bug: https://github.com/orgs/vercel/discussions/234
    ],
    max: 3
}
});

hookIsPartialAfterSequelizeInit();

export default sequelizeInstance;
