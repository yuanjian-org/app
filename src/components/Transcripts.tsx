import {
  Card,
  CardBody,
  Select,
  Button,
  Spacer,
  Flex,
  Text,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  ModalOverlay,
  VStack
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import trpc, { trpcNext } from "../trpc";
import { Transcript } from '../shared/Transcript';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { diffInMinutes, prettifyDate, prettifyDuration } from 'shared/strings';
import { parseQueryString } from "shared/strings";
import Loader from 'components/Loader';
import ReactMarkdown from 'react-markdown';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import replaceUrlParam from 'shared/replaceUrlParam';
import { sidebarBreakpoint } from 'components/Navbars';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { MinUser } from 'shared/User';
import { NameMap } from 'shared/Summary';

export default function Transcripts({ groupId, groupUsers }: {
  groupId: string
  groupUsers: MinUser[]
}) {
  const { data: transcripts } = trpcNext.transcripts.list.useQuery({ groupId });
  return !transcripts ? <Loader /> : transcripts.length ?
    <LoadedTranscripts transcripts={transcripts} groupUsers={groupUsers} /> :
    <Text color="gray">无通话历史。会议结束后一小时之内会显示在这里。</Text>;
}

/**
 * Caller should guarantee that `transcripts` has one or more items.
 */
function LoadedTranscripts({ transcripts: unsorted, groupUsers }: {
  transcripts: Transcript[]
  groupUsers: MinUser[]
}) {
  // Make a shadow copy
  const sorted = [...unsorted];
  // Sort by reverse chronological order
  sorted.sort((t1, t2) => diffInMinutes(t1.startedAt, t2.startedAt));

  const router = useRouter();
  const getTranscriptAndIndex = () => {
    const id = parseQueryString(router, "transcriptId");
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].transcriptId == id) return { t: sorted[i], i };
    }
    return { t: sorted[0], i: 0 };
  };
  const { t: transcript, i: transcriptIndex } = getTranscriptAndIndex();

  const { data: summaries, refetch: refetchSummary } = trpcNext.summaries.listToBeRenamed.useQuery(transcript.transcriptId);
  let summary: { summaryKey: string; summary: string; } | null = null;
  if (summaries) {
    // Every transcript should have at least one summary which is the raw transcripts.
    invariant(summaries.length);
    const key = parseQueryString(router, "summaryKey");
    const match = summaries.filter(s => s.summaryKey == key);
    summary = match.length ? match[0] : summaries[0];
  }
  
  const { data: nameMap, refetch: refetchNameMap } = trpcNext.transcripts.getNameMap.useQuery({ transcriptId: transcript.transcriptId });
  
  const [nameMapModal, setNameMapModal] = useState(false);
  const handleNameMapModal = async () => {
    setNameMapModal(!nameMapModal);
  };

  return (
    <Flex direction="column" gap={sectionSpacing}>
      <Flex>
        <Button variant="ghost" leftIcon={<ChevronLeftIcon />}
          isDisabled={transcriptIndex == sorted.length - 1}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex + 1].transcriptId)}
        >前一次</Button>
        <Spacer />
        <Flex direction={{ base: "column", [sidebarBreakpoint]: "row" }} gap={componentSpacing}>
          <Select value={transcript.transcriptId} 
            onChange={ev => replaceUrlParam(router, "transcriptId", ev.target.value)}
          >
            {sorted.map((t, idx) => <option key={t.transcriptId} value={t.transcriptId}>
              {`${prettifyDate(t.startedAt)}，${prettifyDuration(t.startedAt, t.endedAt)}${!idx ? "（最近通话）" : ""}`}
            </option>)}
          </Select>
          {summaries && summary && 
            <Select value={summary.summaryKey}
              onChange={ev => replaceUrlParam(router, "summaryKey", ev.target.value)}
            >
              {summaries.map(s => <option key={s.summaryKey} value={s.summaryKey}>{s.summaryKey}</option>)}
            </Select>
          }
        </Flex>
        <Button onClick={handleNameMapModal} variant='brand' >用户匹配</Button>
        <Spacer />
        <Button variant="ghost" rightIcon={<ChevronRightIcon />}
          isDisabled={transcriptIndex == 0}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex - 1].transcriptId)}        
        >后一次</Button>
      </Flex> 
      {!summary ? <Loader /> :
        <Card variant="outline" backgroundColor="backgroundLight">
          <CardBody>
            <ReactMarkdown>{summary.summary}</ReactMarkdown>
          </CardBody>
        </Card>
      }
      {nameMapModal &&
        <NameMapModal
          nameMap={nameMap}
          groupUsers={groupUsers}
          onClose={() => {
            handleNameMapModal();
            refetchSummary();
            refetchNameMap();
          }} />}
    </Flex>
  );
}

function NameMapModal({ nameMap, groupUsers, onClose }: {
  nameMap: NameMap | undefined
  groupUsers: MinUser[]
  onClose: () => void,
}) {
  const [updatedUserMap, setUpdatedUserMap] = useState<{ [key: string]: NameMap}>({});
  const [initialUserMap, setInitialUserMap] = useState(updatedUserMap);
  // If not updated the user.name type, will throw a type mismatch error
  const hasName = (user: { name: string | null; id: string }): user is { name: string; id: string } => {
    return user.name !== null;
  };

  useEffect(() => {
    let userMap: {[key: string]: NameMap} = {};
    for (const key in nameMap) {
      const matchedUser = groupUsers.find(gu => gu.name?.includes(nameMap[key]));
      if (matchedUser && hasName(matchedUser)) {
        userMap[key] = matchedUser;
      } else {
        userMap[key] = { name: nameMap[key], id: '' };
      }
    }
    setUpdatedUserMap(userMap);
    setInitialUserMap(userMap);
  }, [nameMap, groupUsers]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, handlebar: string) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedUserName = selectedOption.text;
  
    // if placeholder/ undefined value is selected
    if (!e.target.value) {
      // update the updatedUserMap
      setUpdatedUserMap(prevMap => ({
        ...prevMap,
        [handlebar]: { name: "", id: "" } // Reset to an empty state
      }));
    } else {
      setUpdatedUserMap(prevMap => ({
        ...prevMap,
        [handlebar]: { name: selectedUserName, id: e.target.value }
      }));
    }
  };

  const save = async () => {
    try {
      trpc.transcripts.updateNameMap.mutate(
        Object.entries(updatedUserMap).reduce((acc: { [key: string]: string }, [handlebar, userMap]) => {
          if (userMap.id) { acc[handlebar] = userMap.id; }
          return acc;
        }, {})
      );
    } finally {
      onClose();
    }
  };

  return (
    <ModalWithBackdrop isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>User Selection</ModalHeader>
        <ModalCloseButton />
        <FormControl>
          <ModalBody>
            <VStack spacing={4}>
              {Object.entries(updatedUserMap || {}).map(([handlebar, groupUser]) => (
                <FormControl key={handlebar}>
                  <FormLabel htmlFor={handlebar}>
                    <ReactMarkdown>{handlebar + ' &hArr; ' + initialUserMap[handlebar].name}</ReactMarkdown>
                  </FormLabel>
                  <Select
                    id={handlebar}
                    value={groupUser.id}
                    placeholder='选择用户'
                    onChange={(e) => handleSelectChange(e, handlebar)}
                  >
                    {groupUsers.map((gu) => (
                      <option key={gu.id} value={gu.id}>
                        {gu.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme='brand' onClick={save}>
              保存
            </Button>
          </ModalFooter>
        </FormControl>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
