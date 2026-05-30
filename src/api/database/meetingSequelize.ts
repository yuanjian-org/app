import { Sequelize } from "sequelize-typescript";
import { commonSequelizeConfig } from "./sequelizeConfig";
import MeetingSlot from "./models/MeetingSlot";

// Use MEETING_DATABASE_URI if provided, otherwise default to DATABASE_URI
const uri = process.env.MEETING_DATABASE_URI || process.env.DATABASE_URI;

if (!uri) {
  throw new Error("DATABASE_URI is not set.");
}

const meetingSequelize = new Sequelize(uri, {
  ...commonSequelizeConfig(),
  models: [MeetingSlot],
});

export default meetingSequelize;
