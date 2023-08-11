import { z } from 'zod';
import { zInterviewType } from './InterviewType';

export const zCalibration = z.object({
    id: z.string(),
    type: zInterviewType,
    name: z.string(),
  });
export type Calibration = z.TypeOf<typeof zCalibration>;
