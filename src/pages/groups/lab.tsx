import {
  VStack,
  StackDivider
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from '../../AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import { trpcNext } from "../../trpc";
import GroupBar from '../../components/GroupBar';
import Loader from '../../components/Loader';

const Page: NextPageWithLayout = () => {
  const { data } = trpcNext.groups.listCountingTranscripts.useQuery({ userIds: [] });

  return <>
    {!data && <Loader />}
    <VStack divider={<StackDivider />} align='left' spacing='3'>
      {data && data
        .filter(group => group.transcripts?.length)
        .map(group => <GroupBar key={group.id} group={group} showSelf showTranscriptCount showTranscriptLink />)}
    </VStack>
  </>;
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
