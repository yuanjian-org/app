import {
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Text,
  VStack,
  FormErrorMessage,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  SimpleGrid,
  Flex,
  Box,
  Divider,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import { AddIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import Partnership, { isValidPartnershipIds } from 'shared/Partnership';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import UserChip from 'components/UserChip';
import { sidebarBreakpoint } from 'components/NavBars';

const Page: NextPageWithLayout = () => {
  const { data: partnerships, refetch } : { data: Partnership[] | undefined, refetch: () => void } 
    = trpcNext.partnerships.list.useQuery();
  const [ modalIsOpen, setModalIsOpen ] = useState(false);

  return <Flex direction='column' gap={6}>
    <Box>
      <Button variant='brand' leftIcon={<AddIcon />} onClick={() => setModalIsOpen(true)}>创建导师匹配</Button>
    </Box>
    {modalIsOpen && <AddModel onClose={() => {
      setModalIsOpen(false);
      refetch();
    }} />}
    {!partnerships ? <Loader /> : <Table>
      <Thead>
        <Tr><Th>学生</Th><Th>老师</Th></Tr>
      </Thead>
      <Tbody>
      {partnerships.map((p, idx) => (
        <Tr key={idx}>
          <Td width={{ [sidebarBreakpoint]: '12em' }}><UserChip user={p.mentee} /></Td>
          <Td><UserChip user={p.mentor} /></Td>
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
      <ModalHeader>创建导师匹配</ModalHeader>
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
