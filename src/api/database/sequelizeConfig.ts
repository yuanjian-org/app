import pg from "pg";
import { SequelizeOptions } from "sequelize-typescript";

export const commonSequelizeConfig = (
  min?: number,
  max?: number,
): SequelizeOptions => {
  const options: SequelizeOptions = {
    logging: false,
    dialectModule: pg,
    retry: {
      // Error types: https://sequelize.org/api/v6/identifiers.html#errors
      match: [
        /ConnectionError/, // Fix pg vercel bug: https://github.com/orgs/vercel/discussions/234
      ],
      max: 3,
    },
  };

  if (min !== undefined || max !== undefined) {
    options.pool = {};
    if (min !== undefined) options.pool.min = min;
    if (max !== undefined) options.pool.max = max;
  }

  return options;
};
