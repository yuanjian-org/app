import { procedure } from "../../trpc";
import z from "zod";
import { generalBadRequestError } from "../../errors";
import submitMenteeInterviewerExam from "./menteeInterviewerExam";
import { submitMenteeApp, submitVolunteerApp } from "./application";
import submitUpload from "./upload";
import submitHandbookExam from "./handbookExam";

/**
 * The Webhook for all 金数据 forms.
 */
export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input }) => await submit(input));

export async function submit({ form, entry }: Record<string, any>) {
  switch (form) {
    case "FBTWTe":
    case "S74k0V":
    case "Z82u8w":
      await submitMenteeApp(form, entry);
      break;

    case "OzuvWD":
      await submitVolunteerApp(entry);
      break;

    case "Bz3uSO":
      await submitUpload(entry);
      break;

    case "w02l95":
      await submitMenteeInterviewerExam(entry);
      break;

    case "wqPdKE":
      await submitHandbookExam(entry);
      break;

    default:
      throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }
}
