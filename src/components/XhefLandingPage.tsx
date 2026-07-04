import { Text } from "@chakra-ui/react";
import { SingleColumnLandingPage } from "./SingleColumnLandingPage";

export default function XhefLandingPage() {
  return (
    <SingleColumnLandingPage
      title="远图：珍珠生导师网络"
      heading="欢迎来到珍珠生导师网络"
      buttonLabel="进入远图"
    >
      <Text>
        社会导师项目旨在为大学珍珠生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。“远图”
        是支持这一项目的服务平台。
      </Text>
    </SingleColumnLandingPage>
  );
}
