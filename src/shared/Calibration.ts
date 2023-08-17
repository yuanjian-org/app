import { z } from 'zod';
import { zInterviewType } from './InterviewType';
import { zGroup } from './Group';

export const zCalibration = z.object({
    id: z.string(),
    type: zInterviewType,
    name: z.string(),
    active: z.boolean(),
    // Unlike Assessment.createdAt, we can't use z.date().optional() here becuase zInterview include zCalibration, and
    // for some reason type checking between zInterview and Interview doesn't work even though checking between
    // zCalibration and Calibration works.
    createdAt: z.coerce.string().optional(),
    group: zGroup,
  });
export type Calibration = z.TypeOf<typeof zCalibration>;
