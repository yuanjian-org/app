import { Sequelize } from "sequelize-typescript";
import pg from "pg";
import MeetingSlot from "./models/MeetingSlot";

// Use MEETING_DATABASE_URI if provided, otherwise default to DATABASE_URI
const uri = process.env.MEETING_DATABASE_URI || process.env.DATABASE_URI;

if (!uri) {
  throw new Error("DATABASE_URI is not set.");
}

const meetingSequelize = new Sequelize(uri, {
  models: [MeetingSlot],
  logging: false,
  dialectModule: pg,

  retry: {
    // Error types: https://sequelize.org/api/v6/identifiers.html#errors
    match: [
      /ConnectionError/, // Fix pg vercel bug: https://github.com/orgs/vercel/discussions/234
    ],
    max: 3,
  },

  pool: {
    max: parseInt(process.env.DATABASE_MAX_POOL_SIZE ?? "5"),
    min: parseInt(process.env.DATABASE_MIN_POOL_SIZE ?? "0"),
  },
});

export default meetingSequelize;
