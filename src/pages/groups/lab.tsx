import {
  Box,
  Button,
  VStack,
  StackDivider
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import trpcNext from "../../trpcNext";
import GroupBar from 'components/GroupBar';

const Page: NextPageWithLayout = () => {
  const { data } = trpcNext.groups.listAndCountTranscripts.useQuery({ userIds: [] });

  return (
    <Box paddingTop={'80px'}>
      <VStack divider={<StackDivider />} align='left' spacing='3'>
        {data && data.map(group => <GroupBar key={group.id} group={group} showSelf showTranscriptCount showTranscriptLink />)}
      </VStack>
      {!data && <Button isLoading={true} loadingText={'加载中...'} disabled={true}/>}
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
