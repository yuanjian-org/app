import { z } from "zod";
import { zInterviewType } from "./InterviewType";
import { zMinUser } from "./User";
import { zOptionalDateColumn } from "./DateColumn";

export const zCalibration = z.object({
  id: z.string(),
  type: zInterviewType,
  name: z.string(),
  active: z.boolean(),
  createdAt: zOptionalDateColumn,
  manager: zMinUser.nullable(),
});
export type Calibration = z.TypeOf<typeof zCalibration>;
