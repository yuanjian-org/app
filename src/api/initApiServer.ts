import sequelize from "./database/sequelize";
import invariant from "tiny-invariant";

export default function initApiServer() {
  // ensure database is loaded
  invariant(sequelize);
};
