import { Stack } from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../trpc";
import GroupBar from 'components/GroupBar';
import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import Loader from 'components/Loader';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import Transcripts from 'components/Transcripts';
import { isPermittedForGroupHistory } from 'shared/Group';
import { useUserContext } from 'UserContext';

export default function Page() {
  const router = useRouter();
  const [me] = useUserContext();
  const groupId = parseQueryString(router, "groupId");
  const { data: group } = groupId ? 
    trpcNext.groups.get.useQuery(groupId) : { data: undefined };

  return !group ? <Loader /> : <Stack spacing={sectionSpacing}>
    <GroupBar group={group} showJoinButton showSelf abbreviateOnMobile={false}
      marginBottom={paragraphSpacing} />
    {isPermittedForGroupHistory(me, group) && 
      <Transcripts group={group} />
    }
  </Stack>;
};
