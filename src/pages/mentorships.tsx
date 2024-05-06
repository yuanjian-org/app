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
import { Mentorship, isValidMentorshipIds } from 'shared/Mentorship';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import { useUserContext } from 'UserContext';
import { MinUser } from 'shared/User';
import { MentorshipTableRow } from 'components/MentorshipTableRow';
import { sectionSpacing } from 'theme/metrics';

export default function Page() {
  const [user] = useUserContext();

  const { data: mentorships, refetch } = trpcNext.mentorships.list.useQuery();

  // undefined: editor is closed. null: create a new mentorship. 
  // non-null: edit an existing mentorship
  const [ mentorshipInEdit, setMentorshipInEdit ] = 
    useState<Mentorship | null | undefined>(undefined);

  return <Flex direction='column' gap={sectionSpacing}>
    <Box>
      <Button variant='brand' leftIcon={<AddIcon />} onClick={() =>
        setMentorshipInEdit(null)}>创建一对一匹配</Button>
    </Box>

    {mentorshipInEdit !== undefined && <Editor mentorsihp={mentorshipInEdit}
      onClose={() => {
        setMentorshipInEdit(undefined);
        refetch();
      }}
    />}

    {!mentorships ? <Loader /> : <TableContainer><Table size="sm">
      <Thead><Tr>
        <Th></Th><Th>学生</Th><Th>导师</Th><Th>资深导师</Th><Th>最近师生通话</Th>
        <Th>最近内部笔记</Th><Th>拼音（便于查找）</Th>
      </Tr></Thead>
      <Tbody>
      {mentorships.map(m => <MentorshipTableRow
        key={m.id} showCoach showPinyin mentorship={m} edit={setMentorshipInEdit}
      />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

function Editor({ mentorsihp: m, onClose }: { 
  mentorsihp: Mentorship | null,
  onClose: () => void,
}) {
  const [menteeId, setMenteeId] = useState<string | null>(m ? m.mentee.id : null);
  const [mentorId, setMentorId] = useState<string | null>(m ? m.mentor.id : null);
  // undefined: loading
  const [oldCoach, setOldCoach] = useState<MinUser | null | undefined>(undefined);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!m) {
      setOldCoach(null);
      return;
    }
    const fetch = async () => {
      const coach = await trpc.users.getMentorCoach.query({ userId: m.mentor.id });
      setOldCoach(coach);
    };
    fetch();
  }, [m]);

  const utils = trpcNext.useContext();
  const save = async () => {
    setSaving(true);
    try {
      invariant(menteeId);
      invariant(mentorId);
      if (!m) {
        await trpc.mentorships.create.mutate({
          mentorId, menteeId
        });
      }

      if (coachId) {
        await trpc.users.setMentorCoach.mutate({ userId: mentorId, coachId });
        // Force UI to refresh coach list.
        utils.users.getMentorCoach.invalidate({ userId: mentorId });
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
              isDisabled={m !== null}
              initialValue={m ? [m.mentee] : []}
              onSelect={userIds => setMenteeId(userIds.length ? userIds[0] : null)}
            />
          </FormControl>
          <FormControl isInvalid={menteeId !== null && menteeId === mentorId}>
            <FormLabel>导师</FormLabel>
            <UserSelector
              isDisabled={m !== null}
              initialValue={m ? [m.mentor] : []}
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
          isDisabled={!isValidMentorshipIds(menteeId, mentorId)}
          isLoading={saving} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
