import { router } from "../trpc";
import jinshuju from "./jinshuju";

/**
 * All webhook routes must use `authWebhook` to protect them.
 */
export default router({
  [process.env.WEBHOOK_TOKEN || ""]: router({
    jinshuju,
  }),
});
