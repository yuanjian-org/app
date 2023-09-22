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
  TableContainer,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import { AddIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import { Partnership, PartnershipCountingAssessments, isValidPartnershipIds } from 'shared/Partnership';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import { useUserContext } from 'UserContext';
import { isPermitted } from 'shared/Role';
import NextLink from 'next/link';
import { formatUserName, toPinyin } from 'shared/strings';

export default function Page() {
  const [user] = useUserContext();

  const { data: partnerships, refetch } = trpcNext.partnerships.list.useQuery
    <PartnershipCountingAssessments[] | undefined>();

  // undefined: editor is closed. null: create a new partnership. non-nul: edit an existing partnership
  const [ parntershipInEdit, setParntershipInEdit ] = useState<Partnership | null | undefined>(undefined);

  const showAddButton = isPermitted(user.roles, 'PartnershipManager');
  const showAssessment = isPermitted(user.roles, 'PartnershipAssessor');

  return <Flex direction='column' gap={6}>
    {showAddButton && <Box>
      <Button variant='brand' leftIcon={<AddIcon />} onClick={() => setParntershipInEdit(null)}>创建一对一匹配</Button>
    </Box>}

    {parntershipInEdit !== undefined && <Editor partnership={parntershipInEdit} onClose={() => {
      setParntershipInEdit(undefined);
      refetch();
    }} />}

    {!partnerships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>导师教练</Th><Th>拼音（便于查找）</Th>
          {showAssessment && <Th>跟踪评估</Th>}
        </Tr>
      </Thead>
      <Tbody>
      {partnerships.map(p => (
        <Tr key={p.id} cursor='pointer' _hover={{ bg: "white" }} onClick={() => setParntershipInEdit(p)}>
          <Td>{formatUserName(p.mentee.name, "formal")}</Td>
          <Td>{formatUserName(p.mentor.name, "formal")}</Td>
          <Td>{formatUserName(p.coach.name, "formal")}</Td>
          <Td>{toPinyin(p.mentee.name ?? "")},{toPinyin(p.mentor.name ?? "")},{toPinyin(p.coach.name ?? "")}</Td>
          {showAssessment && <Td>
            <Link as={NextLink} href={`/partnerships/${p.id}/assessments`}>
              查看（{p.assessments.length}）
            </Link>
          </Td>}
        </Tr>
      ))}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

function Editor({ partnership: p, onClose }: { 
  partnership: Partnership | null,
  onClose: () => void,
}) {
  const [menteeId, setMenteeId] = useState<string | null>(p ? p.mentee.id : null);
  const [mentorId, setMentorId] = useState<string | null>(p ? p.mentor.id : null);
  const [coachId, setCoachId] = useState<string | null>(p ? p.coach.id : null);
  const [saving, setSaving] = useState(false);

  const menteeAndMentorAreSameUser = menteeId !== null && menteeId === mentorId;

  const save = async () => {
    setSaving(true);
    try {
      invariant(menteeId);
      invariant(mentorId);
      invariant(coachId);
      if (p) {
        await trpc.partnerships.updateCoach.mutate({
          id: p.id, coachId
        });
      } else {
        await trpc.partnerships.create.mutate({
          mentorId, menteeId, coachId
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>一对一匹配</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>学生</FormLabel>
            <UserSelector
              isDisabled={p !== null}
              initialValue={p ? [p.mentee] : []}
              onSelect={userIds => setMenteeId(userIds.length ? userIds[0] : null)}
            />
          </FormControl>
          <FormControl isInvalid={menteeAndMentorAreSameUser}>
            <FormLabel>导师</FormLabel>
            <UserSelector
              isDisabled={p !== null}
              initialValue={p ? [p.mentor] : []}
              onSelect={userIds => setMentorId(userIds.length ? userIds[0] : null)}
            />
            <FormErrorMessage>导师和学生不能是同一个人。</FormErrorMessage>
          </FormControl>
          <FormControl>
            <FormLabel>导师教练</FormLabel>
            <UserSelector
              initialValue={p ? [p.coach] : []}
              onSelect={userIds => setCoachId(userIds.length ? userIds[0] : null)}
            />
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' 
          isDisabled={!isValidPartnershipIds(menteeId, mentorId, coachId)}
          isLoading={saving} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
