import { trpcNext } from "../trpc";
import { Calibration as SharedCalibration } from "shared/Calibration";
import Interviews from "./Interviews";
import { sectionSpacing } from "theme/metrics";
import { Flex, FlexProps } from "@chakra-ui/react";

export default function Calibration({
  calibration: c,
  ...rest
}: {
  calibration: SharedCalibration;
} & FlexProps) {
  const { data: interviews } = trpcNext.calibrations.getInterviews.useQuery(
    c.id,
  );

  return (
    <Flex direction="column" gap={sectionSpacing} {...rest}>
      <Interviews interviews={interviews} forCalibration />
    </Flex>
  );
}
