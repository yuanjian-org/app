import { Heading, CardHeader, CardBody, Flex } from "@chakra-ui/react";
import { ResponsiveCard } from "components/ResponsiveCard";
import { componentSpacing } from "theme/metrics";
import LaunchpadCardItem from "./LaunchpadCardItem";
import useStaticGlobalConfigs from "components/useStaticGlobalConfigs";
import useWhiteLabel from "components/useWhiteLabel";

export default function VolunteerStudyCard() {
  const { data } = useStaticGlobalConfigs();
  const isDemo = data?.isDemo;
  const whiteLabel = useWhiteLabel();
  const isUstcOrXhef = whiteLabel === "ustc" || whiteLabel === "xhef";

  if (isUstcOrXhef) return null;

  return (
    <ResponsiveCard>
      <CardHeader>
        <Heading size="sm">志愿者学习资料</Heading>
      </CardHeader>
      <CardBody>
        <Flex direction="column" gap={componentSpacing}>
          {!isDemo && (
            <LaunchpadCardItem title="《学生通讯原则》" href="/study/comms" />
          )}
          <LaunchpadCardItem title="《社会导师手册》" href="/study/handbook" />
          <LaunchpadCardItem
            title="《招生流程》与《面试标准》"
            href="/study/interview"
          />
        </Flex>
      </CardBody>
    </ResponsiveCard>
  );
}
