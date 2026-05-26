import pg from "pg";
import { SequelizeOptions } from "sequelize-typescript";

export const commonSequelizeConfig: SequelizeOptions = {
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
};
