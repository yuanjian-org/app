import { router } from "../trpc";
import jinshuju from "./jinshuju";

if (!process.env.WEBHOOK_TOKEN) {
  throw new Error("WEBHOOK_TOKEN is required but not set.");
}

export default router({
  [process.env.WEBHOOK_TOKEN]: router({
    jinshuju,
  }),
});
