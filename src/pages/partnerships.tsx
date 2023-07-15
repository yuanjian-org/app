import {
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  VStack,
  FormErrorMessage,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Box,
  Link,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import { AddIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import { PartnershipCountingAssessments, isValidPartnershipIds } from 'shared/Partnership';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import UserChip from 'components/UserChip';
import { sidebarBreakpoint } from 'components/Navbars';
import { useUserContext } from 'UserContext';
import { isPermitted } from 'shared/Role';
import NextLink from 'next/link';
import { formatUserName, toPinyin } from 'shared/strings';

const Page: NextPageWithLayout = () => {
  const [user] = useUserContext();
  const { data: partnerships, refetch } = trpcNext.partnerships.list.useQuery
    <PartnershipCountingAssessments[] | undefined>();
  const [ modalIsOpen, setModalIsOpen ] = useState(false);

  const showAddButton = isPermitted(user.roles, 'PartnershipManager');
  const showAssessment = isPermitted(user.roles, 'PartnershipAssessor');

  return <Flex direction='column' gap={6}>
    {showAddButton && <Box>
      <Button variant='brand' leftIcon={<AddIcon />} onClick={() => setModalIsOpen(true)}>创建一对一匹配</Button>
    </Box>}

    {modalIsOpen && <AddModel onClose={() => {
      setModalIsOpen(false);
      refetch();
    }} />}

    {!partnerships ? <Loader /> : <Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>学生拼音</Th><Th>导师</Th><Th>导师拼音</Th>
          {showAssessment && <Th>跟踪评估</Th>} <Th>ID（仅调试用）</Th>
        </Tr>
      </Thead>
      <Tbody>
      {partnerships.map(p => (
        <Tr key={p.id}>
          <Td>{formatUserName(p.mentee.name, "formal")}</Td>
          <Td>{toPinyin(p.mentee.name ?? "")}</Td>
          <Td>{formatUserName(p.mentor.name, "formal")}</Td>
          <Td>{toPinyin(p.mentor.name ?? "")}</Td>
          {showAssessment && <Td>
            <Link as={NextLink} href={`/partnerships/${p.id}/assessments`}>
              查看（{p.assessments.length}）
            </Link>
          </Td>}
          <Td>{p.id}</Td>
        </Tr>
      ))}
      </Tbody>
    </Table>}

  </Flex>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function AddModel(props: { 
  onClose: () => void,
}) {
  const [menteeId, setMenteeId] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const menteeAndMentorAreSameUser = menteeId !== null && menteeId === mentorId;

  const save = async () => {
    setSaving(true);
    try {
      invariant(menteeId);
      invariant(mentorId);
      await trpc.partnerships.create.mutate({
        mentorId, menteeId
      });
      props.onClose();
    } finally {
      setSaving(false);
    }
  }

  return <ModalWithBackdrop isOpen onClose={props.onClose}>
    <ModalContent>
      <ModalHeader>创建一对一匹配</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>学生</FormLabel>
            <UserSelector onSelect={userIds => setMenteeId(userIds.length ? userIds[0] : null)}/>
          </FormControl>
          <FormControl isInvalid={menteeAndMentorAreSameUser}>
            <FormLabel>导师</FormLabel>
            <UserSelector onSelect={userIds => setMentorId(userIds.length ? userIds[0] : null)}/>
            <FormErrorMessage>导师和学生不能是同一个人。</FormErrorMessage>
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' 
          isDisabled={!isValidPartnershipIds(menteeId, mentorId)}
          isLoading={saving} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
