import {
  Text,
  VStack,
  Link,
  Alert,
  HStack,
  AlertIcon,
  AlertDescription,
  UnorderedList,
  ListItem,
  Heading,
  CardHeader,
  CardBody,
  StackDivider
} from '@chakra-ui/react';
import { useMyRoles } from "../../useMe";
import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import { isPermitted } from 'shared/Role';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import { ResponsiveCard } from 'components/Card';
import GroupBar from 'components/GroupBar';

export default function GroupsCard() {
  const { data: groups, isLoading } = trpcNext.groups.listMine.useQuery({
    // TODO: This is a hack. Do it properly.
    includeOwned: isPermitted(useMyRoles(), "Mentee"),
  });

  return <ResponsiveCard>
    <CardHeader>
      <Heading size="sm">我的会议</Heading>
    </CardHeader>
    <CardBody>
      {isLoading && <Loader />}

      {!isLoading && groups && groups.length == 0 && <NoGroup />}

      <VStack divider={<StackDivider />} align='left' spacing={6}>
        {groups &&
          groups.map(group => 
            <GroupBar
              key={group.id}
              group={group}
              showJoinButton
              showTranscriptLink
              abbreviateOnMobile
              abbreviateOnDesktop
            />)
        }
      </VStack>
    </CardBody>
  </ResponsiveCard>;
}

function NoGroup() {
  const { data } = trpcNext.users.listRedactedEmailsWithSameName
    .useQuery();

  return <VStack spacing={componentSpacing} align="start">
    {data?.length ?
      <Alert status="warning">
        <HStack>
          <AlertIcon />
          <AlertDescription>
            系统发现有与您同名但使用不同电子邮箱的账号。如果您在当前账号下未找到所需功能，{
            }请尝试退出当前账号，使用以下可能属于您的邮箱或者微信账号重新登录：
            <UnorderedList mt={paragraphSpacing}>
              {data.map((d, idx) => <ListItem key={idx}><b>{d}</b></ListItem>)}
            </UnorderedList>
          </AlertDescription>
        </HStack>
      </Alert>
      :
      <Text color="gray">
        平台提供的功能会根据您的角色的不同而有所差异。如果您未找到所需功能，请与管理员联系。
      </Text>
    }

    <Text mt={componentSpacing}>在使用会议功能前请确保：</Text>
    <Text>🇨🇳 国内用户安装腾讯会议（
      <Link isExternal href="https://meeting.tencent.com/download/">
        下载
      </Link>）
    </Text>
    <Text>🌎 海外用户安装海外版腾讯会议（
      <Link isExternal href="https://voovmeeting.com/download-center.html">
        下载
      </Link>）
    </Text>
  </VStack>;
}
