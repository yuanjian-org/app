import { router } from "../trpc";
import jinshuju from "./jinshuju";

export default router({
  [process.env.WEBHOOK_TOKEN || "invalid_token"]: router({
    jinshuju,
  }),
});
