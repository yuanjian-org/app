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
import React, { useEffect, useState } from 'react';
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
import { toast } from 'react-toastify';
import { MinUser } from 'shared/User';

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
      {partnerships.map(p => <MentorshipRow key={p.id} showAssessment={showAssessment} partnership={p} 
        edit={setParntershipInEdit} />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

function MentorshipRow({ partnership: p, showAssessment, edit }: {
  partnership: PartnershipCountingAssessments,
  showAssessment: boolean,
  edit: (p: Partnership) => void,
}) {
  const { data: coach } = trpcNext.users.getCoach.useQuery({ userId: p.mentor.id });

  return <Tr cursor='pointer' _hover={{ bg: "white" }} onClick={() => edit(p)}>
    <Td>{formatUserName(p.mentee.name, "formal")}</Td>
    <Td>{formatUserName(p.mentor.name, "formal")}</Td>
    <Td>{coach && formatUserName(coach.name, "formal")}</Td>
    <Td>{toPinyin(p.mentee.name ?? "")},{toPinyin(p.mentor.name ?? "")}{coach && "," + toPinyin(coach.name ?? "")}</Td>
    {showAssessment && <Td>
      <Link as={NextLink} href={`/partnerships/${p.id}/assessments`}>
        查看（{p.assessments.length}）
      </Link>
    </Td>}
  </Tr>;
}

function Editor({ partnership: p, onClose }: { 
  partnership: Partnership | null,
  onClose: () => void,
}) {
  const [menteeId, setMenteeId] = useState<string | null>(p ? p.mentee.id : null);
  const [mentorId, setMentorId] = useState<string | null>(p ? p.mentor.id : null);
  // undefined: loading
  const [oldCoach, setOldCoach] = useState<MinUser | null | undefined>(undefined);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!p) {
      setOldCoach(null);
      return;
    }
    const fetch = async () => {
      const coach = await trpc.users.getCoach.query({ userId: p.mentor.id });
      setOldCoach(coach);
    };
    fetch();
  }, [p]);

  const utils = trpcNext.useContext();
  const save = async () => {
    setSaving(true);
    try {
      invariant(menteeId);
      invariant(mentorId);
      if (!p) {
        await trpc.partnerships.create.mutate({
          mentorId, menteeId
        });
      }

      if (coachId) {
        await trpc.users.setCoach.mutate({ userId: mentorId, coachId });
        // Force UI to refresh coach list.
        utils.users.getCoach.invalidate({ userId: mentorId });
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
          <FormControl isInvalid={menteeId !== null && menteeId === mentorId}>
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
            {oldCoach === undefined ? <Loader /> : <UserSelector
              initialValue={oldCoach ? [oldCoach] : []}
              onSelect={userIds => setCoachId(userIds.length ? userIds[0] : null)}
            />}
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
