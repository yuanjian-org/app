import apiEnv from "api/apiEnv";
import { router } from "../trpc";
import {
  submitMenteeApplication, submitVolunteerApplication
} from "./submitApplication";
import submitMenteeInterviewerTestResult from "./submitMenteeInterviewerTestResult";
import upload from "./upload";

export default router({
  [apiEnv.WEBHOOK_TOKEN]: router({
    submitMenteeApplication,
    submitMenteeInterviewerTestResult,
    submitVolunteerApplication,
    upload,
  }),
});
