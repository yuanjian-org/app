import React from 'react'
import { trpcNext } from "../trpc";
import { Calibration } from 'shared/Calibration';
import Interviews from './Interviews';

export default function Calibration({ calibration } : {
  calibration: Calibration
}) {
  const { data: interviews } = trpcNext.calibrations.getInterviews.useQuery(calibration.id);
  
  return <Interviews interviews={interviews} forCalibration />;
}
