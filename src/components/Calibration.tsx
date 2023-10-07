import React from 'react';
import { trpcNext } from "../trpc";
import { Calibration } from 'shared/Calibration';
import Interviews from './Interviews';
import { sectionSpacing } from 'theme/metrics';
import { Flex, FlexProps } from '@chakra-ui/react';
import GroupBar from './GroupBar';

export default function Calibration({ calibration: c, ...rest } : {
  calibration: Calibration,
} & FlexProps) {
  const { data: interviews } = trpcNext.calibrations.getInterviews.useQuery(c.id);
  
  return <Flex direction="column" gap={sectionSpacing} {...rest}>
    <GroupBar group={c.group} showSelf showJoinButton showGroupName={false} showTranscriptLink
      abbreviateOnDesktop
    />
    <Interviews interviews={interviews} forCalibration />
  </Flex>;
}
