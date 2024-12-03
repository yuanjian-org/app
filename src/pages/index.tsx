import {
  StackDivider,
  Text,
  VStack,
  Link,
  Alert,
  HStack,
  AlertIcon,
  AlertDescription,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import React from 'react';
import { useUserContext } from "../UserContext";
import { trpcNext } from "../trpc";
import GroupBar from 'components/GroupBar';
import PageBreadcrumb from 'components/PageBreadcrumb';
import Loader from 'components/Loader';
import { isPermitted } from 'shared/Role';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';

export default function Page() {
  const [me] = useUserContext();
  const { data: groups, isLoading } = trpcNext.groups.listMine.useQuery({
    // TODO: This is a hack. Do it properly.
    includeOwned: isPermitted(me.roles, "Mentee"),
  });

  return (<>
    <PageBreadcrumb current='我的会议' parents={[]} />

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
          />)
      }
    </VStack>
  </>);
}

Page.title = "我的会议";

function NoGroup() {
  const { data } = trpcNext.users.listRedactedEmailsWithSameName
    .useQuery();

  return <VStack spacing={componentSpacing} align="start">
    {data?.length && 
      <Alert status="warning" mb={componentSpacing}>
        <HStack>
          <AlertIcon />
          <AlertDescription>
            系统发现有与您同名但使用不同电子邮箱的账号。如果您在当前账号下未找到所需功能，{
            }请尝试使用以下可能属于您的邮箱重新登录：
            <UnorderedList mt={paragraphSpacing}>
              {data.map((d, idx) => <ListItem key={idx}><b>{d}</b></ListItem>)}
            </UnorderedList>
          </AlertDescription>
        </HStack>
      </Alert>
    }

    <Text>
      平台提供的功能会根据您的角色的不同而有所差异。如果您未找到所需功能，请与管理员联系。{
      }在继续使用前请确保：</Text>
    <Text>🇨🇳 国内用户请安装腾讯会议（
      <Link isExternal href="https://meeting.tencent.com/download/">
        下载
      </Link>）
    </Text>
    <Text>🌎 海外用户请安装海外版腾讯会议（
      <Link isExternal href="https://voovmeeting.com/download-center.html">
        下载
      </Link>）
    </Text>
  </VStack>;
}
