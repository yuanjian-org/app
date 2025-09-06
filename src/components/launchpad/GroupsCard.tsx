import {
  Text,
  VStack,
  Link,
  Heading,
  CardHeader,
  CardBody,
  StackDivider,
} from "@chakra-ui/react";
import { useMyRoles } from "../../useMe";
import { trpcNext } from "../../trpc";
import Loader from "components/Loader";
import { isPermitted } from "shared/Role";
import { componentSpacing } from "theme/metrics";
import { ResponsiveCard } from "components/ResponsiveCard";
import GroupBar from "components/GroupBar";
import { SmallGrayText } from "components/SmallGrayText";

export default function GroupsCard() {
  const { data: groups, isLoading } = trpcNext.groups.listMine.useQuery({
    // TODO: This is a hack. Do it properly.
    includeOwned: isPermitted(useMyRoles(), "Mentee"),
  });

  return (
    <ResponsiveCard>
      <CardHeader>
        <Heading size="sm">我的会议</Heading>
      </CardHeader>
      <CardBody>
        {isLoading && <Loader />}

        {!isLoading && groups && groups.length == 0 && <NoGroup />}

        <VStack divider={<StackDivider />} align="left" spacing={6}>
          {groups &&
            groups.map((group) => (
              <GroupBar
                key={group.id}
                group={group}
                showJoinButton
                showTranscriptLink
                abbreviateOnMobile
                abbreviateOnDesktop
              />
            ))}
        </VStack>
      </CardBody>
    </ResponsiveCard>
  );
}

function NoGroup() {
  return (
    <VStack spacing={componentSpacing} align="start">
      <Text>在使用会议功能前请确保：</Text>
      <Text>
        🇨🇳 国内用户安装腾讯会议（
        <Link isExternal href="https://meeting.tencent.com/download/">
          下载
        </Link>
        ）
      </Text>
      <Text>
        🌎 海外用户安装海外版腾讯会议（
        <Link isExternal href="https://voovmeeting.com/download-center.html">
          下载
        </Link>
        ）
      </Text>

      <SmallGrayText>
        本网站提供的功能会根据用户角色不同而有所差异。如果您未找到所需功能，
        <Link
          href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
          target="_blank"
        >
          请联系客服
        </Link>
        。
      </SmallGrayText>
    </VStack>
  );
}
