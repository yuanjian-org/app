import SharedEnv from "../shared/SharedEnv";
import { loadEnvConfig } from '@next/env';
import { IsNotEmpty, validateOrReject } from "class-validator";

// See .env.template to see what are these env variables and how to configure them.
class ApiEnv extends SharedEnv {
  @IsNotEmpty()
  DATABASE_URI: string = process.env.DATABASE_URI ?? '';

  @IsNotEmpty()
  AUTHING_USER_POOL_ID: string = process.env.AUTHING_USER_POOL_ID ?? '';
  @IsNotEmpty()
  AUTHING_USER_POOL_SECRET: string = process.env.AUTHING_USER_POOL_SECRET ?? '';

  INTEGRATION_AUTH_TOKEN: string | undefined = process.env.INTEGRATION_AUTH_TOKEN;

  TM_ENTERPRISE_ID: string = process.env.TM_ENTERPRISE_ID ?? '';
  TM_APP_ID: string = process.env.TM_APP_ID ?? '';
  TM_SECRET_ID: string = process.env.TM_SECRET_ID ?? '';
  TM_SECRET_KEY: string = process.env.TM_SECRET_KEY ?? '';
  TM_ADMIN_USER_ID: string = process.env.TM_ADMIN_USER_ID ?? '';

  SENDGRID_API_KEY: string = process.env.SENDGRID_API_KEY ?? '';

  hasSendGrid() { return this.SENDGRID_API_KEY.length != 0; }

  // 'DUMMY' was used in some old development environments
  hasTencentMeeting() { return this.TM_SECRET_KEY.length != 0 && this.TM_SECRET_KEY != 'DUMMY'; }
}

// force load env before app.prepare()
loadEnvConfig(process.cwd());

const apiEnv = new ApiEnv();

validateOrReject(apiEnv).catch(errors => {
  console.error('Invalid env variables: ', errors);
  throw Error('Found invalid env variables. See console messages above for detail');
});

export default apiEnv;
