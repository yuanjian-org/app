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
  WrapItem,
  Wrap,
  Select,
  TableCellProps,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Switch,
  Box,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import React, { useMemo, useState, useEffect } from 'react';
import { trpcNext } from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import trpc from 'trpc';
import Loader from 'components/Loader';
import UserSelector from 'components/UserSelector';
import invariant from 'tiny-invariant';
import { compareChinese, formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import { useRouter } from 'next/router';
import { Interview } from 'shared/Interview';
import { AddIcon, CheckIcon, ChevronRightIcon, ViewIcon } from '@chakra-ui/icons';
import { InterviewType } from 'shared/InterviewType';
import User, { MinUser } from 'shared/User';
import { menteeSourceField } from 'shared/applicationFields';
import TdLink from 'components/TdLink';
import moment from 'moment';
import { Calibration } from 'shared/Calibration';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import EditableWithIconOrLink from 'components/EditableWithIconOrLink';
import { widePage } from 'AppPage';
import {
  PointOfContactCells, PointOfContactHeaderCells
} from 'components/pointOfContactCells';
import { 
  CalibrationManagerCells, 
  CalibrationManagerHeaderCells 
} from 'components/CalibrationManagerCells';
import { 
  MenteeSourceCell, 
  MenteeSourceHeaderCell 
} from 'components/MenteeSourceCell';

export default widePage(() => {
  const type: InterviewType = useRouter().query.type === "mentee" ?
    "MenteeInterview" : "MentorInterview";

  // TODO: Optimize and merge the first two queries.
  const { data: applicants, refetch: refetchApplicants } =
    trpcNext.interviews.listPendingCandidates.useQuery(type);
  const { data: interviews, refetch: refetchInterview } =
    trpcNext.interviews.list.useQuery(type);
  const { data: calibrations, refetch: refetchCalibrations } =
    trpcNext.calibrations.list.useQuery(type);

  return <Flex direction='column' gap={6}>
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>{type == "MenteeInterview" ? "学生" : "导师"}候选人列表</Tab>
        <Tab>面试讨论组</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          {!interviews || !applicants ? <Loader /> : 
            <Applicants type={type} applicants={applicants}
              interviews={interviews} refetchInterviews={refetchInterview} 
              refetchApplicants={refetchApplicants}
            />
          }
        </TabPanel>
        <TabPanel>
          {!calibrations ? <Loader /> : 
            <Calibrations type={type} calibrations={calibrations} refetch={() => {
              void refetchCalibrations();
              // When calibration name changes, interviews may need a refetch as well.
              void refetchInterview();
            }} />
          }
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
  </Flex>;
}, "面试");

function Applicants({ type, applicants, interviews, refetchInterviews,
  refetchApplicants
 }: {
  type: InterviewType,
  applicants: User[],
  interviews: Interview[], 
  refetchInterviews: () => void,
  refetchApplicants: () => void,
}) {
  // A map from applicants' user ids to sources.
  const [sources, setSources] = useState<{ [id: string]: string }>({});
  const updateSource = (id: string) => (source: string) => {
    setSources(prev => {
      if (prev[id] === source) return prev; 
      return { ...prev, [id]: source };
    });
  };
  const sortedApplicants = useMemo(() => {
    return applicants.sort((a1, a2) => {
      const comp = compareChinese(sources[a1.id], sources[a2.id]);
      return comp !== 0 ? comp : compareChinese(a1.name, a2.name);
    });
  }, [applicants, sources]);

  return <TableContainer>
    <Text marginBottom={sectionSpacing} color="grey" fontSize="sm">
      点击候选人以编辑面试官和面试讨论组：
    </Text>

    <Table size="sm">
      <Thead>
        <Tr>
          <PointOfContactHeaderCells />
          <Th>候选人</Th><Th>拼音（方便查找）</Th><Th>面试官</Th>
          <MenteeSourceHeaderCell /><Th>面试讨论组</Th><Th>申请表</Th>
          <Th>面试页</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedApplicants.map(a => 
          <Applicant key={a.id} type={type} applicant={a}
            interviews={interviews} refetchInterviews={refetchInterviews}
            refetchApplicants={refetchApplicants} 
            updateSource={updateSource(a.id)}
          />)
        }
      </Tbody>
    </Table>

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{applicants.length}</b> 名
    </Text>

    <Text marginTop={sectionSpacing} color="grey" fontSize="sm">
      <CheckIcon /> 表示已经填写了面试反馈的面试官。
    </Text>
  </TableContainer>;
}

function Applicant({ type, applicant, interviews, refetchInterviews,
  refetchApplicants, updateSource
 } : {
  type: InterviewType,
  applicant: User,
  interviews: Interview[],
  refetchInterviews: () => void,
  refetchApplicants: () => void,
  updateSource: (source: string) => void,
}) {
  // TODO: it's duplicative to fetch the applicant again
  const { data } = trpcNext.users.getApplicant.useQuery({ userId: applicant.id, type });
  const source = (data?.application as Record<string, any> | null)?.[menteeSourceField];

  useEffect(() => {
    updateSource(source);
  }, [source, updateSource]);

  const matches = interviews.filter(i => i.interviewee.id == applicant.id);
  if (matches.length > 1) {
    console.error(`Applicant id ${applicant.id} has multiple matching ` +
      `interviews ids:`);
    matches.map(i => console.error(`  ${i.id}`));
    console.error("We must let the frontend die");
    invariant(false);
  }
  const interview = matches.length ? matches[0] : null;

  /**
   * undefined: close interview editor
   * null: create a new interview
   * otherwise: edit the existing interview
   */
  const [interviewInEditor, setInterviewInEditor] =
    useState<Interview | null | undefined>(undefined);

  const TdEditLink = ({ children }: TableCellProps) =>
    <TdLink href="#" onClick={() => setInterviewInEditor(interview)}>
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
      <PointOfContactCells user={applicant} refetch={refetchApplicants} />

      {/* 候选人 */}
      <TdEditLink>
        <b>{formatUserName(applicant.name)}</b>
      </TdEditLink>
      
      {/* 拼音 */}
      <TdEditLink>{toPinyin(applicant.name ?? "")}</TdEditLink>

      {/* 面试官 */}
      <TdEditLink><Wrap spacing="2">
        {interview && interview.feedbacks.map(f => <WrapItem key={f.id}>
          {formatUserName(f.interviewer.name)}
          {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
        </WrapItem>)}
      </Wrap></TdEditLink>

      {/* 生源 */}
      {source && <MenteeSourceCell application={data?.application} />}

      {/* 面试讨论组 */}
      <TdEditLink>
        {interview && interview.calibration?.name}
      </TdEditLink>

      {/* 申请表 */}
      <TdLink href={`/applicants/${applicant.id}?type=${type == "MenteeInterview" ? "mentee" : "mentor"}`}>
        申请表 <ChevronRightIcon />
      </TdLink>

      {/* 面试页 */}
      {interview && <TdLink href={`/interviews/${interview.id}`}>
        面试页 <ChevronRightIcon />
      </TdLink>}
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
  const [calibrationId, setCalibrationId] =
    useState<string>(interview?.calibration?.id || "");

  const save = async () => {
    setSaving(true);
    try {
      const cid = calibrationId.length ? calibrationId : null;
      if (interview) {
        await trpc.interviews.update.mutate({
          type,
          id: interview.id, 
          calibrationId: cid,
          intervieweeId: applicant.id,
          interviewerIds,
        });
      } else {
        await trpc.interviews.create.mutate({
          type,
          calibrationId: cid,
          intervieweeId:
          applicant.id,
          interviewerIds,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>
        {interview ? "修改" : "创建"}{type == "MenteeInterview" ? "学生": "导师"}面试
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>候选人</FormLabel>
            <Text>{formatUserName(applicant.name)}</Text>
          </FormControl>
          <FormControl>
            <FormLabel>面试官</FormLabel>
            <UserSelector
              isMulti 
              onSelect={userIds => setInterviewerIds(userIds)}
              initialValue={!interview ? [] : interview.feedbacks.map(f => f.interviewer)}
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
  };

  const update = async (old: Calibration, name: string, active: boolean) => {
    if (old.name === name && old.active === active) return;
    await trpc.calibrations.update.mutate({ id: old.id, name, active });
    refetch();
  };

  return <Flex direction="column" gap={paragraphSpacing}>
    <Box>
      说明：
      <UnorderedList>
        <ListItem>通过候选人列表的”修改面试“功能为每位候选人分配面试讨论组。</ListItem>
        <ListItem>如果候选人A属于面试讨论组C，那么A的所有面试官都是C的参与者。</ListItem>
        <ListItem>C的参与者能够访问属于C的所有候选人的申请表和面试页。</ListItem>
        <ListItem>当C的状态是”开启“时，C的参与者可以在”我的面试“页看到并进入C。</ListItem>
      </UnorderedList>
    </Box>

    <Box><Button leftIcon={<AddIcon />} onClick={create}>新建面试讨论组</Button></Box>

    <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>名称</Th>
          <CalibrationManagerHeaderCells />
          <Th>状态</Th><Th>创建日期</Th><Th>进入</Th>
        </Tr>
      </Thead>
      <Tbody>
        {calibrations
          // Sort by creation time desending
          .sort((c1, c2) => moment(c2.createdAt).diff(moment(c1.createdAt), "seconds"))
          .map(c => {
            return <Tr key={c.id}>
              <Td>
                <EditableWithIconOrLink editor="input" decorator="icon"
                  defaultValue={c.name} maxWidth={60} 
                  onSubmit={v => update(c, v, c.active)} 
                />
              </Td>
              <CalibrationManagerCells calibration={c} refetch={refetch} />
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
