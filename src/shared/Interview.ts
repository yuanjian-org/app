import { z } from "zod";
import { zMinUser } from "./User";
import { zFeedback, zInterviewer } from "./InterviewFeedback";
import { zGroup } from "./Group";
import { zCalibration } from "./Calibration";
import { zInterviewType } from "./InterviewType";

export const zInterview = z.object({
  id: z.string(),
  type: zInterviewType,
  calibration: zCalibration.nullable(),
  interviewee: zMinUser,

  // TODO: rename to calibrationFeedback & interviewers respectively
  decision: zFeedback.nullable(),
  feedbacks: z.array(zInterviewer),
});
export type Interview = z.TypeOf<typeof zInterview>;

export const zInterviewWithGroup = zInterview.merge(
  z.object({
    group: zGroup,
  }),
);
