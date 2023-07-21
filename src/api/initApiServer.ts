import sequelizeInstance from "./database/sequelizeInstance";
import invariant from "tiny-invariant";

export default function initApiServer() {
  // ensure database is loaded
  invariant(sequelizeInstance);
};
