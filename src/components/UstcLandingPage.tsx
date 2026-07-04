import { Text } from "@chakra-ui/react";
import { SingleColumnLandingPage } from "./SingleColumnLandingPage";

export default function UstcLandingPage() {
  return (
    <SingleColumnLandingPage
      title="远图：中国科学技术大学社会导师网络"
      heading="欢迎来到中国科学技术大学社会导师网络"
      buttonLabel="进入远图"
    >
      <Text>
        社会导师项目由中科大校友发起并提供，旨在为中科大在校学生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。“远图”
        是支持这一项目的服务平台。
      </Text>
    </SingleColumnLandingPage>
  );
}
