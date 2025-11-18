import { procedure } from "../../trpc";
import z from "zod";
import { generalBadRequestError } from "../../errors";
import { submitMenteeApp, submitVolunteerApp } from "./application";
import submitUpload from "./upload";
import submitExam from "./exam";

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
    case "nhFsf1":
      await submitUpload(entry);
      break;

    // /exams/interview
    case "w02l95":
      await submitExam(entry, "menteeInterviewerExam", 110);
      break;

    // /exams/handbook
    case "wqPdKE":
      await submitExam(entry, "handbookExam", 100);
      break;

    // /exams/comms
    case "nsnx4G":
      await submitExam(entry, "commsExam", 115);
      break;

    default:
      throw generalBadRequestError(`金数据 form id ${form} is not suppoted.`);
  }
}
