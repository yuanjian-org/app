import { Sequelize } from "sequelize-typescript";
import User from "./models/User";
import apiEnv from "../apiEnv";
import { hookIsPartialAfterSequelizeInit } from "./modelHelpers/ZodColumn";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Transcript from "./models/Transcript";
import Summary from "./models/Summary";
import OngoingMeetingCount from "./models/OngoingMeetingCount";

const sequelizeInstance = new Sequelize(apiEnv.DATABASE_URI, {
  models: [User, Group, GroupUser, Transcript, Summary, OngoingMeetingCount],
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
