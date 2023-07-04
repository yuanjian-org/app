import {
  Box,
  VStack,
  StackDivider
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import trpcNext from "../../trpcNext";
import GroupBar from 'components/GroupBar';
import Loader from 'components/Loader';

const Page: NextPageWithLayout = () => {
  const { data } = trpcNext.groups.listAndCountTranscripts.useQuery({ userIds: [] });

  return (
    <Box paddingTop={'80px'}>
      {!data && <Loader />}
      <VStack divider={<StackDivider />} align='left' spacing='3'>
        {data && data.map(group => <GroupBar key={group.id} group={group} showSelf showTranscriptCount showTranscriptLink />)}
      </VStack>
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
