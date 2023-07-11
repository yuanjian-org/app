import { validateOrReject } from "class-validator";
import SharedEnv from "./shared/SharedEnv";

class BrowserEnv extends SharedEnv {
};

const env = new BrowserEnv();

validateOrReject(env).catch(errors => {
  console.error('Invalid env variables: ', errors);
  throw Error('Found invalid env variables. See console messages above for detail');
});

export default env;
