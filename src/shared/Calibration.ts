import { z } from 'zod';
import { zInterviewType } from './InterviewType';
import { zGroup } from './Group';
import { zMinUser } from './User';
import { zOptionalDateColumn } from './DateColumn';

export const zCalibration = z.object({
  id: z.string(),
  type: zInterviewType,
  name: z.string(),
  active: z.boolean(),
  createdAt: zOptionalDateColumn,
  group: zGroup,
  manager: zMinUser.nullable(),
});
export type Calibration = z.TypeOf<typeof zCalibration>;
