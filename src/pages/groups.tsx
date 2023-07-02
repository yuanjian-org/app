import {
  Box,
  Button,
  StackDivider,
  WrapItem,
  Wrap,
  HStack,
  SimpleGrid,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Center,
  Icon,
  FormErrorMessage,
  Flex,
  Spacer,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import trpc from "../trpc";
import AsyncSelect from "react-select/async";
import trpcNext from "../trpcNext";
import GroupBar, { UserChip } from 'components/GroupBar';
import { Group } from 'api/routes/groups';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { MdEditNote, MdPersonRemove } from 'react-icons/md';

function UserSelector(props: {
  value: any,
  onChange: any,
  placeholder?: string,
}) {
  type Option = {
    label: string,
    value: string,
  };

  const LoadOptions = (
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

  // https://react-select.com/props
  return <AsyncSelect
    cacheOptions
    // @ts-ignore
    loadOptions={LoadOptions}
    isMulti
    value={props.value}
    noOptionsMessage={() => "可以用姓名拼音、中文或email检索"}
    loadingMessage={() => "正在检索..."}
    placeholder={props.placeholder ?? '按用户过滤，或为创建分组输入两名或以上用户'}
    // @ts-ignore
    onChange={props.onChange}
  />
}

const Page: NextPageWithLayout = () => {
  const [selected, setSelected] = useState<{ value: string, label: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [groupBeingEdited, setGroupBeingEdited] = useState<Group | null>(null);

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

  const closeGroupEditor = () => {
    setGroupBeingEdited(null);
    refetch();
  };

  return (
    <Box paddingTop={'80px'}>
      {groupBeingEdited && <GroupEditor group={groupBeingEdited} onClose={closeGroupEditor}/>}
      <Wrap spacing={6}>
        <WrapItem minWidth={100}>
          <UserSelector value={selected} onChange={setSelected} />
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
        {data && data.map(group => 
          <Flex key={group.id} cursor='pointer'
            onClick={() => setGroupBeingEdited(group)} 
          >
            <GroupBar group={group} showSelf />
            <Spacer />
            <Center><Icon as={MdEditNote} marginX={4} /></Center>
          </Flex>
        )}
      </VStack>
      {!data && <Button isLoading={true} loadingText={'载入组员信息中...'} disabled={true}/>}
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;


function GroupEditor(props: { 
  group: Group,
  onClose: () => void,
}) {
  const [name, setName] = useState(undefined);
  const [selected, setSelected] = useState<{ value: string, label: string }[]>([]);
  const [users, setUsers] = useState(props.group.users);
  const [saving, setSaving] = useState(false);

  const isValid = users.length + selected.length > 1;

  const save = async () => {
    setSaving(true);
    try {
      const group = structuredClone(props.group);
      group.users = [
        ...selected.map(s => ({ id: s.value, name: null })),
        ...users,
      ];

      await trpc.groups.update.mutate(group);
      props.onClose();
    } finally {
      setSaving(false);
    }
  }

  return <ModalWithBackdrop isOpen onClose={props.onClose}>
    <ModalContent>
      <ModalHeader>编辑分组</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>分组名称</FormLabel>
            <Input value={name} placeholder='若为空则用默认名称' />
          </FormControl>
          <FormControl>
            <FormLabel>添加用户</FormLabel>
            <UserSelector value={selected} placeholder='' onChange={setSelected} />
          </FormControl>
          <FormControl>
            <FormLabel>移除用户</FormLabel>
          </FormControl>
          {users.map(u =>
            <FormControl key={u.id} cursor='pointer'
              onClick={() => setUsers(users.filter(user => user.id !== u.id))}
            >
              <Flex>
              <UserChip user={u} />
              <Spacer />
              <Icon as={MdPersonRemove} boxSize={6}/>
              </Flex>
            </FormControl>
          )}
          <FormControl isInvalid={!isValid}>
            <FormErrorMessage>需要至少两名用户。</FormErrorMessage>
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button>删除分组</Button>
        <Spacer />
        <Button variant='brand' isLoading={saving} isDisabled={!isValid} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
