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
  Input,
  Select,
  Tooltip,
  TableCellProps,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Editable,
  EditablePreview,
  EditableInput,
  Switch,
  HStack,
  useEditableControls,
  IconButton,
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
import { formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import { useRouter } from 'next/router';
import { Interview } from 'shared/Interview';
import { AddIcon, CheckIcon, EditIcon, ViewIcon } from '@chakra-ui/icons';
import { InterviewType } from 'shared/InterviewType';
import { MinUser } from 'shared/User';
import { menteeSourceField } from 'shared/menteeApplicationFields';
import TdLink from 'components/TdLink';
import moment from 'moment';
import { Calibration } from 'shared/Calibration';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';

const Page: NextPageWithLayout = () => {
  const type: InterviewType = useRouter().query.type === "mentee" ? "MenteeInterview" : "MentorInterview";

  const { data: applicants } = trpcNext.users.list.useQuery(type == "MenteeInterview" ?
    { hasMenteeApplication: true } : { hasMentorApplication: true });
  const { data: interviews, refetch: refetchInterview } = trpcNext.interviews.list.useQuery(type);
  const { data: calibrations, refetch: refetchCalibrations } = trpcNext.calibrations.list.useQuery(type);

  return <Flex direction='column' gap={6}>
    <Tabs isLazy>
      <TabList>
        <Tab>{type == "MenteeInterview" ? "学生" : "老师"}候选人</Tab>
        <Tab>面试讨论</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          {!interviews || !applicants ? <Loader /> : 
            <Applicants type={type} applicants={applicants} interviews={interviews} 
              refetchInterviews={refetchInterview} 
            />
          }
        </TabPanel>
        <TabPanel>
          {!calibrations ? <Loader /> : 
            <Calibrations type={type} calibrations={calibrations} refetch={() => {
              refetchCalibrations();
              // When calibration name changes, interviews may need a refetch as well.
              refetchInterview();
            }} />
          }
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Flex>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function Applicants({ type, applicants, interviews, refetchInterviews }: {
  type: InterviewType,
  applicants: MinUser[],
  interviews: Interview[], 
  refetchInterviews: () => any,
}) {
  return <TableContainer>
    <Table>
      <Thead>
        <Tr>
          <Th>修改面试</Th><Th>候选人</Th><Th>拼音</Th><Th>生源（悬停光标看全文）</Th>
          <Th>面试官</Th><Th>面试讨论组</Th><Th>查看详情</Th>
        </Tr>
      </Thead>
      <Tbody>
        {applicants.map(a => 
          <Applicant key={a.id} type={type} applicant={a} interviews={interviews} refetchInterviews={refetchInterviews} />)
        }
      </Tbody>
    </Table>

    <Text marginTop={sectionSpacing} fontSize="sm"><CheckIcon /> 表示已经填写了面试反馈的面试官。</Text>
  </TableContainer>;
}

function Applicant({ type, applicant, interviews, refetchInterviews } : {
  type: InterviewType,
  applicant: MinUser,
  interviews: Interview[],
  refetchInterviews: () => any,
}) {
  const { data: application } = trpcNext.users.getApplication.useQuery({ userId: applicant.id, type });
  const source = (application as Record<string, any> | null)?.[menteeSourceField];

  const matches = interviews.filter(i => i.interviewee.id == applicant.id);
  invariant(matches.length <= 1);
  const interview = matches.length ? matches[0] : null;

  /**
   * undefined: close interview editor
   * null: create a new interview
   * otherwise: edit the existing interview
   */
  const [interviewInEditor, setInterviewInEditor] = useState<Interview | null | undefined>(undefined);

  const TdEditLink = ({ children }: TableCellProps) => <TdLink href="#" onClick={() => setInterviewInEditor(interview)}>
    {children}
  </TdLink>;

  return <>
    {interviewInEditor !== undefined && <InterviewEditor type={type}
      applicant={applicant} interview={interviewInEditor}
      onClose={() => {
        setInterviewInEditor(undefined);
        refetchInterviews();
      }} 
    />}

    <Tr key={applicant.id} _hover={{ bg: "white" }}>
      <TdEditLink>
        {interview ? <EditIcon /> : <AddIcon />}
      </TdEditLink>
      <TdEditLink>
        {formatUserName(applicant.name, "formal")}
      </TdEditLink>
      <TdEditLink>{toPinyin(applicant.name ?? "")}</TdEditLink>
      <TdEditLink>
        {source && <Tooltip label={source}>
          <Text isTruncated maxWidth="130px">{source}</Text>
        </Tooltip>}
      </TdEditLink>
      <TdEditLink><Wrap spacing="2">
        {interview && interview.feedbacks.map(f => <WrapItem key={f.id}>
          {formatUserName(f.interviewer.name, "formal")}
          {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
        </WrapItem>)}
      </Wrap></TdEditLink>
      <TdEditLink>
        {interview && interview.calibration?.name}
      </TdEditLink>
      {interview ? <TdLink href={`/interviews/${interview.id}`}><ViewIcon /></TdLink> : <Td />}
    </Tr>
  </>;
}

function InterviewEditor({ type, applicant, interview, onClose }: {
  type: InterviewType,
  applicant: MinUser,
  interview: Interview | null,  // Create a new interview when null
  onClose: () => void,
}) {
  invariant(interview == null || interview.type == type);

  const [interviewerIds, setInterviewerIds] = useState<string[]>(
    interview ? interview.feedbacks.map(f => f.interviewer.id) : []);
  const [saving, setSaving] = useState(false);

  const { data: calibrations } = trpcNext.calibrations.list.useQuery(type);
  // When selecting "-“ <Select> emits "".
  const [calibrationId, setCalibrationId] = useState<string>(interview?.calibration?.id || "");
  
  const isValid = () => interviewerIds.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      invariant(isValid());
      const cid = calibrationId.length ? calibrationId : null;
      if (interview) {
        await trpc.interviews.update.mutate({
          id: interview.id, type, calibrationId: cid, intervieweeId: applicant.id, interviewerIds,
        });
      } else {
        await trpc.interviews.create.mutate({
          type, calibrationId: cid, intervieweeId: applicant.id, interviewerIds,
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
            <FormLabel>候选人</FormLabel>
            <Text>{formatUserName(applicant.name, "formal")}</Text>
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
            <Select placeholder="-"
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

function Calibrations({ type, calibrations, refetch }: {
  type: InterviewType,
  calibrations: Calibration[],
  refetch: () => void,
}) {
  const create = async () => {
    // Find an unused name
    let name: string;
    let count = 1;
    do {
      name = `新面试讨论 (${count++})`;
    } while (calibrations.some(c => c.name === name));
    await trpc.calibrations.create.mutate({ type, name });
    refetch();
  }

  const update = async (old: Calibration, name: string, active: boolean) => {
    if (old.name === name && old.active === active) return;
    await trpc.calibrations.update.mutate({ id: old.id, name, active });
    refetch();
  };

  return <Flex direction="column" gap={paragraphSpacing}>
    <HStack spacing={6}>
      <Button leftIcon={<AddIcon />} onClick={create}>新建</Button>
      <Text>开启的面试讨论将显示在所有讨论所涉及面试官的”我的面试“页。</Text>
    </HStack>

    <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>名称</Th><Th>状态</Th><Th>创建日期</Th><Th>查看</Th>
        </Tr>
      </Thead>
      <Tbody>
        {calibrations
          // Sort by creation time desending
          .sort((c1, c2) => moment(c2.createdAt).diff(moment(c1.createdAt), "seconds"))
          .map(c => {
            return <Tr key={c.id}>
              <Td>
                <EditableCalibrationName calibration={c} update={update} />
              </Td>
              <Td>
                <Switch isChecked={c.active} onChange={e => update(c, c.name, e.target.checked)} />
                {" "} {c.active ? "开启" : "关闭"}
              </Td>
              <Td>
                {c.createdAt && prettifyDate(c.createdAt)}
              </Td>
              <TdLink href={`/calibrations/${c.id}`}>
                <ViewIcon />
              </TdLink>
            </Tr>;
          })
        }
      </Tbody>
    </Table></TableContainer>
  </Flex>;
}

function EditableCalibrationName({ calibration: c, update }: {
  calibration: Calibration,
  update: (c: Calibration, name: string, active: boolean) => void,
}) {
  // See https://chakra-ui.com/docs/components/editable#with-custom-input-and-controls
  const EditableControls = () => {
    const { isEditing, getEditButtonProps } = useEditableControls();
    return isEditing ? null : <IconButton aria-label='Edit' icon={<EditIcon />} {...getEditButtonProps()} />;
  }

  return <Editable defaultValue={c.name} maxWidth={60} onSubmit={v => update(c, v, c.active)}>
    <EditablePreview />
    <EditableInput />
    <EditableControls />
  </Editable>;
}
