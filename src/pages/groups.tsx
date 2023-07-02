import {
  Box,
  Button,
  VStack,
  StackDivider,
  WrapItem,
  Wrap
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import trpc from "../trpc";
import AsyncSelect from "react-select/async";
import trpcNext from "../trpcNext";
import GroupBar from 'components/GroupBar';

type Option = {
  label: string,
  value: string,
}
const loadOptions = (
  inputValue: string,
  callback: (options: Option[]) => void
) => {
  trpc.users.list.query({
    searchTerm: inputValue,
  }).then(users => {
    callback(users.map(u => {
      return {
        label: `${u.name} (${u.email})`,
        value: u.id,
      };
    }));
  })
}

const Page: NextPageWithLayout = () => {
  const [selected, setSelected] = useState<{label: string, value: string}[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data, refetch } = trpcNext.groups.list.useQuery({
    userIds: selected.map(option => option.value),
  });

  const createGroup = async () => {
    setIsCreating(true);
    try {
      await trpc.groups.create.mutate({
        userIds: selected.map(option => option.value),
      });
      refetch();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box paddingTop={'80px'}>
      <Wrap spacing={6}>
        <WrapItem minWidth={100}>
          {/* https://react-select.com/props */}
          <AsyncSelect
            cacheOptions
            loadOptions={loadOptions}
            isMulti
            value={selected}
            noOptionsMessage={() => "可以用姓名拼音、中文或email检索"}
            loadingMessage={() => "正在检索..."}
            placeholder='按用户过滤，或为创建分组选择两名或更多用户...&nbsp;&nbsp;&nbsp;'
            onChange={(v) => setSelected(v.map(item => ({ label: item.label, value: item.value })))}
          />
        </WrapItem>
        <WrapItem>
          <Button
            isLoading={isCreating}
            isDisabled={selected.length < 2}
            loadingText='创建分组中...'
            variant='brand' onClick={createGroup}>
            创建分组
          </Button>
        </WrapItem>
      </Wrap>
      <VStack divider={<StackDivider />} align='left' marginTop={8} spacing='3'>
        {data && data.map(group => <GroupBar key={group.id} group={group} showSelf />)}
      </VStack>
      {!data && <Button isLoading={true} loadingText={'载入组员信息中...'} disabled={true}/>}
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
