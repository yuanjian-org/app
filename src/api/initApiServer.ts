import sequelizeInstance from "./database/sequelizeInstance";
import invariant from "tiny-invariant";

let isInitDone = false;

const initApiServer = async () => {
  if (isInitDone) {
    return;
  }

  // ensure database is loaded
  invariant(sequelizeInstance);

  isInitDone = true;
};

export default initApiServer;
