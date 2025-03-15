import { loadEnvConfig } from '@next/env';
import { IsNotEmpty, validateOrReject } from "class-validator";

/**
 * New env variables should be referred to directly at where they are used.
 * 
 * TODO: Remove this class entirely.
 */
class ApiEnvDeprecated {
  @IsNotEmpty()
  DATABASE_URI: string = process.env.DATABASE_URI ?? '';

  INTEGRATION_AUTH_TOKEN: string | undefined = process.env.INTEGRATION_AUTH_TOKEN;

  TM_ENTERPRISE_ID: string = process.env.TM_ENTERPRISE_ID ?? '';
  TM_APP_ID: string = process.env.TM_APP_ID ?? '';
  TM_SECRET_ID: string = process.env.TM_SECRET_ID ?? '';
  TM_SECRET_KEY: string = process.env.TM_SECRET_KEY ?? '';
  TM_USER_IDS: string[] = (process.env.TM_USER_IDS ?? '').split(',');

  WEBHOOK_TOKEN: string = process.env.WEBHOOK_TOKEN ?? '';

  // 'DUMMY' was used in some old development environments
  hasTencentMeeting() { return this.TM_SECRET_KEY.length != 0 && this.TM_SECRET_KEY != 'DUMMY'; }
}

// force load env before app.prepare()
loadEnvConfig(process.cwd());

const apiEnv = new ApiEnvDeprecated();

validateOrReject(apiEnv).catch(errors => {
  console.error('Invalid env variables: ', errors);
  throw Error('Found invalid env variables. See console messages above for detail');
});

export default apiEnv;
