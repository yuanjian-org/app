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
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  TableContainer,
  Box,
  WrapItem,
  Wrap,
  LinkOverlay,
  LinkBox,
  HStack,
  Input,
  Select,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import Loader from 'components/Loader';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import { formatUserName, toPinyin } from 'shared/strings';
import { useRouter } from 'next/router';
import { Interview, InterviewType } from 'shared/Interview';
import { AddIcon, CheckIcon } from '@chakra-ui/icons';

const Page: NextPageWithLayout = () => {
  const type: InterviewType = useRouter().query.type === "mentee" ? "MenteeInterview" : "MentorInterview";

  const { data: interviews, refetch } = trpcNext.interviews.list.useQuery<Interview[] | undefined>(type);
  const [interviewEditorIsOpen, setEditorIsOpen] = useState(false);
  const [interviewBeingEdited, setInterviewBeingEdited] = useState<Interview | null>(null);
  const [calibrationEditorIsOpen, setCalibrationEditorIsOpen] = useState(false);

  const editInterview = (i: Interview | null) => {
    setInterviewBeingEdited(i);
    setEditorIsOpen(true);
  }

  return <Flex direction='column' gap={6}>
    <Box>
      <HStack spacing={4}>
        <Button variant='brand' leftIcon={<AddIcon />} onClick={() => editInterview(null)}>
          创建{type == "MenteeInterview" ? "学生": "导师"}面试
        </Button>
        <Button leftIcon={<AddIcon />} onClick={() => setCalibrationEditorIsOpen(true)}>
          创建面试讨论组
        </Button>
      </HStack>
    </Box>

    {interviewEditorIsOpen && <InterviewEditor type={type} interview={interviewBeingEdited} onClose={() => {
      setEditorIsOpen(false);
      refetch();
    }} />}

    {calibrationEditorIsOpen && <CalibrationEditor type={type} onClose={() => setCalibrationEditorIsOpen(false)} />}

    <Text><CheckIcon /> 表示已经填写了面试反馈的面试官：</Text>

    {!interviews ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>候选人</Th><Th>拼音</Th><Th>面试官</Th>
        </Tr>
      </Thead>
      <Tbody>
      {interviews.map(i => (
        <LinkBox as={Tr} key={i.id}>
          <Td>
            <LinkOverlay href="#" onClick={() => editInterview(i)}>
              {formatUserName(i.interviewee.name, "formal")}
            </LinkOverlay>
          </Td>
          <Td>{toPinyin(i.interviewee.name ?? "")}</Td>
          <Td><Wrap spacing="2">
            {i.feedbacks.map(f =>
              <WrapItem key={f.id}>
                {formatUserName(f.interviewer.name, "formal")}
                {f.feedbackUpdatedAt && <CheckIcon />}
              </WrapItem>
            )}
          </Wrap></Td>
        </LinkBox>
      ))}
      </Tbody>
    </Table></TableContainer>}

  </Flex>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function InterviewEditor({ type, interview, onClose }: {
  type: InterviewType,
  interview: Interview | null,  // Create a new interview when null
  onClose: () => void,
}) {
  invariant(interview == null || interview.type == type);

  const [intervieweeId, setIntervieweeId] = useState<string | null>(
    interview ? interview.interviewee.id : null);
  const [interviewerIds, setInterviewerIds] = useState<string[]>(
    interview ? interview.feedbacks.map(f => f.interviewer.id) : []);
  const [saving, setSaving] = useState(false);

  const { data: calibrations } = trpcNext.calibrations.list.useQuery(type);
  // When selecting "无“ <Select> emits "".
  const [calibrationId, setCalibrationId] = useState<string>(interview?.calibrationId || "");
  
  const isValid = () => intervieweeId != null && interviewerIds.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      invariant(isValid());
      invariant(intervieweeId);
      const cid = calibrationId.length ? calibrationId : null;
      if (interview) {
        await trpc.interviews.update.mutate({
          id: interview.id, type, calibrationId: cid, intervieweeId, interviewerIds,
        });
      } else {
        await trpc.interviews.create.mutate({
          type, calibrationId: cid, intervieweeId, interviewerIds,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  }

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>{interview ? "修改" : "创建"}{type == "MenteeInterview" ? "学生": "导师"}面试</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>{type == "MenteeInterview" ? "学生": "导师"}候选人</FormLabel>
            <UserSelector
              onSelect={userIds => setIntervieweeId(userIds.length ? userIds[0] : null)}
              initialValue={!interview ? [] : [{
                label: interview.interviewee.name ?? "",
                value: interview.interviewee.id,
              }]}
            />
          </FormControl>
          <FormControl>
            <FormLabel>面试官</FormLabel>
            <UserSelector
              isMulti 
              onSelect={userIds => setInterviewerIds(userIds)}
              initialValue={!interview ? [] : interview.feedbacks.map(f => ({
                label: f.interviewer.name ?? "",
                value: f.interviewer.id,
              }))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>面试讨论组</FormLabel>
            <Select placeholder="无"
              onChange={e => setCalibrationId(e.target.value)}
              value={calibrationId}
            >
              {calibrations?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' 
          isDisabled={!isValid()}
          isLoading={saving} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}


function CalibrationEditor({ type, onClose }: {
  type: InterviewType,
  onClose: () => void,
}) {
  const [name, setName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const isValid = () => name.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      invariant(isValid());
      await trpc.calibrations.create.mutate({ type, name });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>创建面试讨论组</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>讨论组名称</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)} 
              placeholder="比如：2024届中科大"
            />
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' 
          isDisabled={!isValid()}
          isLoading={saving} onClick={save}>创建</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
