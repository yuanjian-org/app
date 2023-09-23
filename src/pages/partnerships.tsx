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
  Flex,
  Box,
  TableContainer,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import { AddIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import { Partnership, isValidPartnershipIds } from 'shared/Partnership';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import { useUserContext } from 'UserContext';
import { MinUser } from 'shared/User';
import { MentorshipTableRow } from 'components/MentorshipTableRow';
import { sectionSpacing } from 'theme/metrics';

export default function Page() {
  const [user] = useUserContext();

  const { data: partnerships, refetch } = trpcNext.partnerships.list.useQuery();

  // undefined: editor is closed. null: create a new partnership. non-nul: edit an existing partnership
  const [ mentorshipInEdit, setMentorshipInEdit ] = useState<Partnership | null | undefined>(undefined);

  return <Flex direction='column' gap={sectionSpacing}>
    <Box>
      <Button variant='brand' leftIcon={<AddIcon />} onClick={() => setMentorshipInEdit(null)}>创建一对一匹配</Button>
    </Box>

    {mentorshipInEdit !== undefined && <Editor partnership={mentorshipInEdit} onClose={() => {
      setMentorshipInEdit(undefined);
      refetch();
    }} />}

    {!partnerships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>资深导师</Th><Th>拼音（便于查找）</Th><Th>最近通话</Th>
        </Tr>
      </Thead>
      <Tbody>
      {partnerships.map(p => <MentorshipTableRow
        key={p.id} showCoach showPinyin mentorship={p} edit={setMentorshipInEdit}
      />)}
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
            <FormLabel>资深导师</FormLabel>
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
