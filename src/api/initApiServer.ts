import sequelizeInstance from "./database/sequelizeInstance";
import invariant from "tiny-invariant";

const initApiServer = () => {
  // ensure database is loaded
  invariant(sequelizeInstance);
};

export default initApiServer;
