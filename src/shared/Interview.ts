import { z } from "zod";
import { zMinUser } from "./User";
import {
  zFeedbackDeprecated,
  zMinInterviewFeedback,
} from "./InterviewFeedback";
import { zGroup } from "./Group";
import { zCalibration } from "./Calibration";
import { zInterviewType } from "./InterviewType";

export const zInterview = z.object({
  id: z.string(),
  type: zInterviewType,
  calibration: zCalibration.nullable(),
  interviewee: zMinUser,

  // TODO: rename to calibrationFeedback & interviewers respectively
  decision: zFeedbackDeprecated.nullable(),
  feedbacks: z.array(zMinInterviewFeedback),
});
export type Interview = z.TypeOf<typeof zInterview>;

export const zInterviewWithGroup = zInterview.merge(
  z.object({
    group: zGroup,
  }),
);
