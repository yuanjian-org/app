import apiEnv from "api/apiEnv";
import { router } from "../trpc";
import submitMenteeApplication from "./submitMenteeApplication";
import submitMenteeInterviewerTestResult from "./submitMenteeInterviewerTestResult";
import upload from "./upload";

export default router({
  [apiEnv.WEBHOOK_TOKEN]: router({
    submitMenteeApplication,
    submitMenteeInterviewerTestResult,
    upload,
  }),
});
