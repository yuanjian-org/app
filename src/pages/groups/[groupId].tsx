import { Stack } from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../trpc";
import GroupBar from 'components/GroupBar';
import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import Loader from 'components/Loader';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import Transcripts from 'components/Transcripts';

export default function Page() {
  const router = useRouter();
  const groupId = parseQueryStringOrUnknown(router, "groupId");
  const { data: group } = trpcNext.groups.get.useQuery(groupId);

  return !group ? <Loader /> : <Stack spacing={sectionSpacing}>
    <GroupBar group={group} showJoinButton showSelf abbreviateOnMobile={false} marginBottom={paragraphSpacing} />
    <Transcripts groupId={group.id} />
  </Stack>;
};
