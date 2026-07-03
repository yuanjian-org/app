import { whiteLabel } from "shared/WhiteLabel";
import { Heading, CardHeader, CardBody, Flex } from "@chakra-ui/react";
import { ResponsiveCard } from "components/ResponsiveCard";
import { componentSpacing } from "theme/metrics";
import LaunchpadCardItem from "./LaunchpadCardItem";
import { features } from "shared/Features";

export default function MentorCard() {
  if (whiteLabel === "demo") return null;

  if (!features.relational && !features.exams && !features.interviews) {
    return null;
  }

  return (
    <ResponsiveCard>
      <CardHeader>
        <Heading size="sm">社会导师工具</Heading>
      </CardHeader>
      <CardBody>
        <Flex direction="column" gap={componentSpacing}>
          {features.relational && (
            <LaunchpadCardItem
              padding
              title="初次交流反馈"
              href="/match/feedback"
            />
          )}

          {features.exams && (
            <>
              <LaunchpadCardItem title="《学生通讯原则》" href="/study/comms" />
              <LaunchpadCardItem
                title="《社会导师手册》"
                href="/study/handbook"
              />
            </>
          )}

          {features.interviews && (
            <LaunchpadCardItem
              title="《招生流程》与《面试标准》"
              href="/study/interview"
            />
          )}
        </Flex>
      </CardBody>
    </ResponsiveCard>
  );
}
