import {
  Button,
  StackDivider,
  WrapItem,
  Wrap,
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
  Checkbox,
  Link
} from '@chakra-ui/react';
import React, { useState } from 'react';
import trpc from "../trpc";
import { trpcNext } from "../trpc";
import GroupBar from 'components/GroupBar';
import UserChip from 'components/UserChip';
import { Group, isOwned } from '../shared/Group';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { MdPersonRemove } from 'react-icons/md';
import { formatGroupName } from 'shared/strings';
import { EditIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import UserSelector from '../components/UserSelector';
import QuestionIconTooltip from "../components/QuestionIconTooltip";

export const publicGroupDescription = "公开会议允许任何有远图会议链接的用户加入会议。" + 
  "仅下列用户有权查看会议历史。";

export default function Page() {
  const [userIds, setUserIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [groupBeingEdited, setGroupBeingEdited] = useState<Group | null>(null);
  const [includeOwned, setIncludeOwned] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data, refetch } = trpcNext.groups.list.useQuery(
    { userIds, includeOwned, includeArchived });

  const createGroup = async () => {
    setCreating(true);
    try {
      await trpc.groups.create.mutate({ userIds });
      void refetch();
    } finally {
      setCreating(false);
    }
  };

  const closeGroupEditor = () => {
    setGroupBeingEdited(null);
    void refetch();
  };

  return <>
    {groupBeingEdited && <GroupEditor group={groupBeingEdited} onClose={closeGroupEditor}/>}

    <Wrap spacing={6}>
      <WrapItem minWidth={100} alignItems="center">
        <UserSelector isMulti placeholder="按用户过滤，或为创建分组输入两名或以上用户" onSelect={setUserIds} />
      </WrapItem>
      <WrapItem alignItems="center">
        <Button
          isLoading={creating}
          isDisabled={userIds.length < 2}
          loadingText='创建分组中...'
          variant='brand' onClick={createGroup}>
          创建自由分组
        </Button>
      </WrapItem>
      <WrapItem alignItems="center">
        <Checkbox isChecked={includeOwned} onChange={e => setIncludeOwned(e.target.checked)}>显示托管分组</Checkbox>
        <QuestionIconTooltip label="”托管分组“是通过一对一导师匹配、学生面试等功能自动创建的分组。其他分组叫 ”自由分组“。" />
      </WrapItem>
      <WrapItem alignItems="center">
        <Checkbox isChecked={includeArchived} 
          onChange={e => setIncludeArchived(e.target.checked)}
        >显示已存档分组</Checkbox>
      </WrapItem>
    </Wrap>
    <VStack divider={<StackDivider />} align='left' marginTop={8} spacing='3'>
      {data && data.map(group => 
        <Flex key={group.id} {...!isOwned(group) && { 
          cursor: 'pointer',
          onClick: () => setGroupBeingEdited(group),
        }}>
          <GroupBar group={group} showSelf />
          <Spacer />
          {!isOwned(group) && <Center><EditIcon marginX={4} /></Center>}
        </Flex>
      )}
    </VStack>
    {!data && <Loader />}
  </>;
};

function GroupEditor({ group, onClose }: { 
  group: Group,
  onClose: () => void,
}) {
  const [name, setName] = useState<string>(group.name || '');
  const [isPublic, setIsPublic] = useState(group.public);
  const [newUserIds, setNewUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState(group.users);
  const [working, setWorking] = useState(false);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);

  const isValid = users.length + newUserIds.length > 1;

  const save = async () => {
    setWorking(true);
    try {
      const cloned = structuredClone(group);
      cloned.name = name;
      cloned.public = isPublic;
      cloned.users = [
        ...newUserIds.map(n => ({ id: n, name: null })),
        ...users,
      ];
      await trpc.groups.update.mutate(cloned);
      onClose();
    } finally {
      setWorking(false);
    }
  };

  const archive = async () => {
    try {
      await trpc.groups.archive.mutate({ groupId: group.id });
    } finally {
      onClose();
    }
  };

  const unarchive = async () => {
    try {
      await trpc.groups.unarchive.mutate({ groupId: group.id });
    } finally {
      onClose();
    }
  };

  const destroy = async () => {
    setConfirmingDeletion(false);
    try {
      await trpc.groups.destroy.mutate({ groupId: group.id });
    } finally {
      onClose();
    }
  };

  return <>
    <ModalWithBackdrop isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>编辑会议分组</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6}>
            <FormControl>
              <FormLabel>会议链接 {' '}
                <Link href={`${window.location.origin}/groups/${group.id}`}
                  target='_blank'>
                  <ExternalLinkIcon />
                </Link>
              </FormLabel>
              <code>{window.location.origin}/groups/{group.id}</code>
            </FormControl>
            <FormControl>
              <FormLabel>分组名称</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={"若为空则显示默认名称：" +
                  formatGroupName(null, group.users.length)}
              />
            </FormControl>
            <FormControl>
              <Checkbox isChecked={isPublic} 
                onChange={(e) => setIsPublic(e.target.checked)}
              >公开：{publicGroupDescription}</Checkbox>
            </FormControl>
            <FormControl>
              <FormLabel>添加用户</FormLabel>
              <UserSelector isMulti onSelect={setNewUserIds} />
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
          {!group.archived ?
            <Button onClick={() => archive()}>存档分组</Button>
            :
            <>
              <Button onClick={() => unarchive()}>取消存档</Button>
              <Spacer />
              <Button onClick={() => setConfirmingDeletion(true)}
                colorScheme="red">删除分组</Button>
            </>
          }
          <Spacer />
          <Button variant='brand' isLoading={working} isDisabled={!isValid}
            onClick={save}>保存</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
    {confirmingDeletion && <ConfirmingDeletionModal onConfirm={destroy}
      onCancel={() => setConfirmingDeletion(false)}/>}
  </>;
}

function ConfirmingDeletionModal(props: {
  onConfirm: () => void,
  onCancel: () => void
}) {
  return <ModalWithBackdrop isOpen onClose={props.onCancel}>
    <ModalContent>
      <ModalHeader />
      <ModalCloseButton />
      <ModalBody>
        确定删除此分组？删除后，相关数据仍保留在数据库中，直到管理员手工清除。
      </ModalBody>
      <ModalFooter>
        <Button onClick={props.onCancel}>取消</Button>
        <Spacer />
        <Button color='red' onClick={props.onConfirm}>确定删除</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}