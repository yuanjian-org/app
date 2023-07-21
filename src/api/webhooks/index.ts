import apiEnv from "api/apiEnv";
import { router } from "../trpc";
import submitMenteeApplication from "./submitMenteeApplication";

export default router({
  [apiEnv.WEBHOOK_TOKEN]: router({
    submitMenteeApplication,
  }),
});
