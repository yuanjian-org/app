import { Stack } from '@chakra-ui/react';
import React, { ReactNode } from 'react';
import AppLayout from "../../AppLayout";
import { trpcNext } from "../../trpc";
import GroupBar from 'components/GroupBar';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from '../../parseQueryString';
import Loader from 'components/Loader';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import Transcripts from 'components/Transcripts';

export default function Page() {
  const router = useRouter();
  const groupId = parseQueryStringOrUnknown(router, "groupId");
  const { data: group } = trpcNext.groups.get.useQuery(groupId);

  return <>
    <PageBreadcrumb current='会议详情' parents={[{ name: '我的会议', link: '/' }]} />
    {!group ? <Loader /> : <Stack spacing={sectionSpacing}>
      <GroupBar group={group} showJoinButton showSelf abbreviateOnMobile={false} marginBottom={paragraphSpacing} />
      <Transcripts groupId={group.id} />
    </Stack>}
  </>;
};

Page.getLayout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
