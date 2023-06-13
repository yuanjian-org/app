import { IsNotEmpty } from "class-validator";
import { stringOrEmpty } from "./utils/string";

// See .env.template to see what are these env variables and how to configure them.
class SharedEnv {
  @IsNotEmpty()
  public NEXT_PUBLIC_AUTHING_APP_ID: string = stringOrEmpty(process.env.NEXT_PUBLIC_AUTHING_APP_ID);

  @IsNotEmpty()
  public NEXT_PUBLIC_AUTHING_APP_HOST: string = stringOrEmpty(process.env.NEXT_PUBLIC_AUTHING_APP_HOST);
}

export default SharedEnv;
