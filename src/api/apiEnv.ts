import SharedEnv from "../shared/SharedEnv";
import { loadEnvConfig } from '@next/env';
import { IsEmail, IsNotEmpty, IsOptional, validateOrReject } from "class-validator";
import { stringOrEmpty } from "../shared/utils/string";

// force load env before app.prepare()
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// See .env.template to see what are these env variables and how to configure them.
class ApiEnv extends SharedEnv {
  @IsNotEmpty()
  DATABASE_URI: string = stringOrEmpty(process.env.DATABASE_URI);

  @IsEmail({}, { each: true })
  ASSIGN_ADMIN_ROLE_ON_SIGN_UP: string[] = process.env.ASSIGN_ADMIN_ROLE_ON_SIGN_UP?.split(',') || [];

  @IsNotEmpty()
  AUTHING_USER_POOL_ID: string = stringOrEmpty(process.env.AUTHING_USER_POOL_ID);
  @IsNotEmpty()
  AUTHING_USER_POOL_SECRET: string = stringOrEmpty(process.env.AUTHING_USER_POOL_SECRET);

  @IsOptional()
  INTEGRATION_AUTH_TOKEN: string | undefined = process.env.INTEGRATION_AUTH_TOKEN;

  @IsNotEmpty()
  TM_ENTERPRISE_ID: string = stringOrEmpty(process.env.TM_ENTERPRISE_ID);
  @IsNotEmpty()
  TM_APP_ID: string = stringOrEmpty(process.env.TM_APP_ID);
  @IsNotEmpty()
  TM_SECRET_ID: string = stringOrEmpty(process.env.TM_SECRET_ID);
  @IsNotEmpty()
  TM_SECRET_KEY: string = stringOrEmpty(process.env.TM_SECRET_KEY);
  @IsNotEmpty()
  TM_ADMIN_USER_ID: string = stringOrEmpty(process.env.TM_ADMIN_USER_ID);
  @IsNotEmpty()
  SENDGRID_API_KEY: string = stringOrEmpty(process.env.SENDGRID_API_KEY);
}

const apiEnv = new ApiEnv();

validateOrReject(apiEnv).catch(errors => {
  console.error('Invalid env variables: ', errors);
  throw Error('Found invalid env variables. See console messages above for detail');
});

export default apiEnv;
