import apiEnv from "api/apiEnv";
import { router } from "../trpc";
import jinshuju from "./jinshuju";

export default router({
  [apiEnv.WEBHOOK_TOKEN]: router({
    jinshuju,
  }),
});
