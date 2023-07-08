import { IsNotEmpty } from "class-validator";

// See .env.template to see what are these env variables and how to configure them.
class SharedEnv {
  @IsNotEmpty()
  public NEXT_PUBLIC_AUTHING_APP_ID: string = process.env.NEXT_PUBLIC_AUTHING_APP_ID ?? '';

  @IsNotEmpty()
  public NEXT_PUBLIC_AUTHING_APP_HOST: string = process.env.NEXT_PUBLIC_AUTHING_APP_HOST ?? '';
}

export default SharedEnv;
