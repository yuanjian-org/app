import {
  Box,
  Button,
  Grid,
  VStack,
  StackDivider
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import trpc from "../../trpc";
import { toast } from "react-toastify";
import AsyncSelect from "react-select/async";
import trpcNext from "../../trpcNext";
import GroupBar from 'components/GroupBar';

type Option = {
  label: string,
  value: string,
}
const loadOptions = (
  inputValue: string,
  callback: (options: Option[]) => void
) => {
  trpc.users.search.query({
    query: inputValue,
  }).then(({ users }) => {
    callback(users.map(u => {
      return {
        label: `${u.name} (${u.email})`,
        value: u.id,
      };
    }));
  })
}

const Page: NextPageWithLayout = () => {
  const [selected, setSelected] = useState([] as {label: string, value: string}[]);
  const [isCreating, setCreating] = useState(false);

  const { data, refetch } = trpcNext.groups.list.useQuery({
    userIds: selected.map(option => option.value),
  });

  const createGroup = async () => {
    setCreating(true);
    trpc.groups.create.mutate({
      userIds: selected.map(option => option.value),
    })
      .then(() => {
        refetch();
      })
      .catch((e) => toast.error(e.message, { autoClose: false }))
      .finally(() => setCreating(false));
  };

  return (
    <Box paddingTop={'80px'}>
      <Box>
        <Grid templateColumns={'3fr 1fr'} columnGap={'20px'}>
          <AsyncSelect
            cacheOptions
            loadOptions={loadOptions}
            isMulti
            value={selected}
            onChange={(v) => setSelected(v.map(item => ({ label: item.label, value: item.value })))}
          />
          <Button
            isLoading={isCreating}
            loadingText='创建分组中...'
            fontSize='sm' variant='brand' fontWeight='500' mb='24px' onClick={async () => {
              createGroup();
          }}>
            创建新分组
          </Button>
        </Grid>
      </Box>
      <VStack divider={<StackDivider />} align='left' spacing='3'>
        {data && data.map(group => <GroupBar key={group.id} group={group} showSelf />)}
      </VStack>
      {!data && <Button isLoading={true} loadingText={'载入组员信息中...'} disabled={true}/>}
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
