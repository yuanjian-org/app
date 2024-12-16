import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Wrap,
  Flex,
  TableContainer,
  Link,
  Text,
  Divider,
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  VStack,
  Spacer,
  LinkProps,
  Tag,
  HStack,
  Icon,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import trpc, { trpcNext } from "../trpc";
import { MinUser, UserFilter, UserWithMergeInfo } from 'shared/User';
import { compareChinese,
  compareDate, 
  formatUserName, 
  hash,
  prettifyDate, 
  toPinyin 
} from 'shared/strings';
import Loader from 'components/Loader';
import UserFilterSelector from 'components/UserFilterSelector';
import { MenteeStatusSelectCell } from 'components/MenteeStatusSelect';
import invariant from 'tiny-invariant';
import { MenteeStatus } from 'shared/MenteeStatus';
import NextLink from "next/link";
import { AddIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { PiFlagCheckeredFill } from "react-icons/pi";
import moment from "moment";
import { isEndedTransactionalMentorship, Mentorship } from 'shared/Mentorship';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import UserSelector from 'components/UserSelector';
import { MdEdit } from 'react-icons/md';
import { sectionSpacing } from 'theme/metrics';
import { menteeAcceptanceYearField } from 'shared/applicationFields';
import { menteeSourceField } from 'shared/applicationFields';
import {
  PointOfContactCells, 
  PointOfContactHeaderCells
} from 'components/pointOfContactCells';
import { widePage } from 'AppPage';
import { TbClockOff, TbClock } from "react-icons/tb";
import ConfirmationModal from 'components/ConfirmationModal';
import MergeTokenCell from 'components/MergeTokenCell';
import { mentorMeetingMessagePrefix } from 'components/ChatRoom';
import { FaAngleDoubleUp, FaAngleDoubleDown } from "react-icons/fa";
import { LuChevronsUpDown } from "react-icons/lu";

type Metadata = {
  // The year the mentee was accepted
  year: string,
  source: string,
};

type SetMetadata = (menteeId: string, metadata: Metadata) => void;

type SortOrderKey = "year" | "source" | "name" | "mentorMeeting" | "transcript";
type SortOrderDir = "asc" | "desc";

type SortOrder = {
  key: SortOrderKey,
  dir: SortOrderDir,
}[];

export default widePage(() => {
  const fixedFilter: UserFilter = {
    containsRoles: ["Mentee"],
    includeNonVolunteers: true,
    returnMergeInfo: true,
  };

  const [filter, setFilter] = useState<UserFilter>(fixedFilter);
  const { data: users, refetch } = trpcNext.users.list.useQuery(filter);

  return <>
    <Flex direction='column' gap={6}>
      <Wrap spacing={4} align="center">
        <UserFilterSelector filter={filter} fixedFilter={fixedFilter} 
          onChange={f => setFilter(f)} />
      </Wrap>
      
      <Divider />

      {!users ? <Loader /> :
        <TableContainer>
          <MenteeTable users={users} refetch={refetch} />
          <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
            共 <b>{users.length}</b> 名
          </Text>
        </TableContainer>
      }
    </Flex>
  </>;
}, "学生档案");

function MenteeTable({ users, refetch }: {
  users: UserWithMergeInfo[],
  refetch: () => void
}) {
  // TODO: Break out into two variables and remove `Metadata` type
  const [mentee2meta, setMentee2meta] = useState<Record<string, Metadata>>({}); 
  // Use callback to avoid infinite re-rendering when mentee2meta is changed.
  const setMetadata = useCallback((userId: string, metadata: Metadata) => {
    setMentee2meta(current => ({
      ...current,
      [userId]: metadata,
    }));
  }, []);

  const [mentee2latestMentorMeetingDate, setMentee2latestMentorMeetingDate] =
    useState<Record<string, string>>({}); 
  const setLatestMentorMeetingDate = useCallback((userId: string, date: string) => {
    setMentee2latestMentorMeetingDate(current => ({
      ...current,
      [userId]: date,
    }));
  }, []);

  const [mentee2latestTranscriptDate, setMentee2latestTranscriptDate] =
    useState<Record<string, string>>({}); 
  const setLatestTranscriptDate = useCallback((userId: string, date: string) => {
    setMentee2latestTranscriptDate(current => ({
      ...current,
      [userId]: date,
    }));
  }, []);

  const defaultSortOrder: SortOrder = [
    { key: "year", dir: "desc" },
    { key: "source", dir: "asc" },
    { key: "name", dir: "asc" },
  ];
  const sortOrderLength = defaultSortOrder.length;

  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const addSortOrder = (key: SortOrderKey, dir: SortOrderDir) => {
    setSortOrder([
      { key, dir },
      ...sortOrder
        .filter(o => o.key !== key)
        .slice(0, sortOrderLength - 1)
    ]);
  };

  const sortUser = useCallback((a: MinUser, b: MinUser) => {
    for (const order of sortOrder) {
      const sign = order.dir === "asc" ? 1 : -1;
      switch (order.key) {
        case "year":
          let comp = (mentee2meta[a.id]?.year ?? "")
            .localeCompare(mentee2meta[b.id]?.year ?? "");
          if (comp !== 0) return sign * comp;
          break;

        case "source":
          comp = compareChinese(
            mentee2meta[a.id]?.source ?? "",
            mentee2meta[b.id]?.source ?? "");
          if (comp !== 0) return sign * comp;
          break;

        case "name":
          comp = compareChinese(a.name, b.name);
          if (comp !== 0) return sign * comp;
          break;

        case "mentorMeeting":
          comp = compareDate(
            mentee2latestMentorMeetingDate[a.id],
            mentee2latestMentorMeetingDate[b.id]);
          if (comp !== 0) return sign * comp;
          break;

        case "transcript":
          comp = compareDate(
            mentee2latestTranscriptDate[a.id],
            mentee2latestTranscriptDate[b.id]);
          if (comp !== 0) return sign * comp;
          break;
      }
    }
    // Fall back to id comparison
    return a.id.localeCompare(b.id);
  }, [mentee2latestMentorMeetingDate, mentee2latestTranscriptDate, mentee2meta, 
    sortOrder]);

  const sortedUsers = useMemo(() => {
    return users.sort(sortUser);
  }, [users, sortUser]); 
 
  return <Table size="sm">
    <Thead>
      <Tr>
        <Th>状态</Th>
        <PointOfContactHeaderCells />
        <MenteeHeaderCells
          sortOrder={sortOrder}
          addSortOrder={addSortOrder}
        />
        <MentorshipHeaderCells
          sortOrder={sortOrder}
          addSortOrder={addSortOrder}
        />
        <SortableHeaderCell
          label="最近导师交流"
          sortOrderKey="mentorMeeting"
          sortOrder={sortOrder}
          addSortOrder={addSortOrder}
        />
        <Th>微信激活码</Th>
        <Th>拼音（便于查找）</Th>
      </Tr>
    </Thead>
    <Tbody>
      {sortedUsers.map(u => <MenteeRow
        key={u.id} 
        user={u} 
        refetch={refetch} 
        setMetadata={setMetadata}
        setLatestMentorMeetingDate={setLatestMentorMeetingDate}
        setLatestTranscriptDate={setLatestTranscriptDate}
      />)}
    </Tbody>
  </Table>;
}

function SortableHeaderCell({ label, sortOrderKey, sortOrder, addSortOrder }: {
  label: string,
  sortOrderKey: SortOrderKey,
  sortOrder: SortOrder,
  addSortOrder: (key: SortOrderKey, dir: SortOrderDir) => void
}) {
  const idx = sortOrder.findIndex(o => o.key === sortOrderKey);
  const dir = idx >= 0 ? sortOrder[idx].dir : undefined;

  return <Th
    _hover={{ cursor: "pointer" }}
    onClick={() => addSortOrder(sortOrderKey, dir === "asc" ? "desc" : "asc")}
  >
    <HStack spacing={0.5}>
      <Text>{label}</Text>
      {idx >= 0 && dir === "asc" && <FaAngleDoubleUp color='grey' />}
      {idx >= 0 && dir === "desc" && <FaAngleDoubleDown color='grey' />}
      {idx >= 0 && <Text color='grey'><sup>{idx + 1}</sup></Text>}
      {/* Use black and not grey for the icon because it's thinner than
          FaAngle* icons. */}
      {idx < 0 && <LuChevronsUpDown />}
    </HStack>
  </Th>;
}

function MenteeRow({
  user: u, refetch, setMetadata, setLatestMentorMeetingDate,
  setLatestTranscriptDate
}: {
  user: UserWithMergeInfo,
  refetch: () => void,
  setMetadata: SetMetadata,
  setLatestMentorMeetingDate: (userId: string, date: string) => void,
  setLatestTranscriptDate: (userId: string, date: string) => void
}) {
  const menteePinyin = toPinyin(u.name ?? '');
  const [pinyin, setPinyins] = useState(menteePinyin);

  const saveStatus = async (menteeStatus: MenteeStatus | null | undefined) => {
    invariant(menteeStatus !== undefined);
    await trpc.users.setMenteeStatus.mutate({ userId: u.id, menteeStatus });
    refetch();
  };

  const addPinyin = useCallback((names: string[]) => {
    if (names.length) {
      setPinyins(`${menteePinyin},${names.map(n => toPinyin(n)).join(',')}`);
    }
  }, [menteePinyin]);

  return <Tr key={u.id} _hover={{ bg: "white" }}>
    <MenteeStatusSelectCell status={u.menteeStatus} onChange={saveStatus} />
    <PointOfContactCells user={u} refetch={refetch} />
    <MenteeCells mentee={u} setMetadata={setMetadata}/>
    <MentorshipCells mentee={u} addPinyin={addPinyin} showCoach
      setLatestTranscriptDate={setLatestTranscriptDate}
    />
    <LatestMentorMeetingDateCell menteeId={u.id}
      setData={setLatestMentorMeetingDate}/>
    <MergeTokenCell user={u} refetch={refetch} />
    <Td>{pinyin}</Td>
  </Tr>;
}

function getColorFromText(text: string): string {
  const colors = ["red", "orange", "yellow", "green", "teal", "blue", "cyan",
    "purple"];
  const index = Math.abs(hash(text)) % colors.length;
  return colors[index];
}

function MenteeHeaderCells({ sortOrder, addSortOrder }: {
  sortOrder: SortOrder,
  addSortOrder: (key: SortOrderKey, dir: SortOrderDir) => void
}) {
  return <>
    <SortableHeaderCell
      label="录取届"
      sortOrderKey="year"
      sortOrder={sortOrder}
      addSortOrder={addSortOrder}
    />
    <SortableHeaderCell
      label="来源"
      sortOrderKey="source"
      sortOrder={sortOrder}
      addSortOrder={addSortOrder}
    />
    <SortableHeaderCell
      label="姓名"
      sortOrderKey="name"
      sortOrder={sortOrder}
      addSortOrder={addSortOrder}
    />
  </>;
}

export function MenteeCells({ mentee, setMetadata } : {
  mentee: MinUser,
  setMetadata?: SetMetadata
}) {
  const { data } = trpcNext.users.getApplicant.useQuery({
    type: "MenteeInterview",
    userId: mentee.id,
  });

  const year = (data?.application as Record<string, any>)
    ?.[menteeAcceptanceYearField];
  
  const source = (data?.application as Record<string, any> | null)
    ?.[menteeSourceField];

  useEffect(() => setMetadata?.(mentee.id, { year, source }),
    [mentee.id, year, source, setMetadata]);

  return <>
    {/* Acceptance Year */}
    <Td>{year && <Tag colorScheme={getColorFromText(year)}>{year}</Tag>}</Td>

    {/* Source */}
    <Td>{source}</Td>

    {/* Name */}
    <Td><Link as={NextLink} href={`/mentees/${mentee.id}`}>
      <b>{mentee.name}</b> <ChevronRightIcon />
    </Link></Td>
  </>;
}

function MentorshipHeaderCells({ sortOrder, addSortOrder }: {
  sortOrder: SortOrder,
  addSortOrder: (key: SortOrderKey, dir: SortOrderDir) => void
}) {
  return <>
    <Th>导师</Th>
    <Th>资深导师</Th>
    <SortableHeaderCell label="最近通话" sortOrderKey="transcript"
      sortOrder={sortOrder} addSortOrder={addSortOrder} />
  </>;
}

export function MentorshipCells({ mentee, addPinyin, showCoach, readonly,
  setLatestTranscriptDate
 } : {
  mentee: MinUser,
  addPinyin?: (names: string[]) => void,
  showCoach?: boolean,
  readonly?: boolean,
  setLatestTranscriptDate?: (userId: string, date: string) => void
}) {
  const { data, refetch } = trpcNext.mentorships.listMentorshipsForMentee
    .useQuery({
      menteeId: mentee.id,
      includeEndedTransactional: true,
    });
  if (!data) return <Td><Loader /></Td>;

  // Stablize list order
  data.sort((a, b) => a.id.localeCompare(b.id));

  return <LoadedMentorsCells mentee={mentee} mentorships={data}
    addPinyin={addPinyin} refetch={refetch} showCoach={showCoach} 
    readonly={readonly} setLatestTranscriptDate={setLatestTranscriptDate} />;
}

function LoadedMentorsCells({
  mentee, mentorships, addPinyin, refetch, showCoach, readonly,
  setLatestTranscriptDate
} : {
  mentee: MinUser,
  mentorships: Mentorship[],
  addPinyin?: (names: string[]) => void,
  refetch: () => void,
  showCoach?: boolean,
  readonly?: boolean,
  setLatestTranscriptDate?: (userId: string, date: string) => void
}) {
  const transcriptRes = trpcNext.useQueries(t => {
    return mentorships.map(m => t.transcripts.getLatestStartedAt({
      groupId: m.group.id
    }));
  });

  useEffect(() => {
    if (!setLatestTranscriptDate) return;

    const now = new Date().toISOString();
    const latest = transcriptRes.reduce((min, res) => {
      if (res.data && compareDate(res.data, min) < 0) return res.data;
      return min;
    }, now);
    if (latest !== now) {
      setLatestTranscriptDate(mentee.id, latest);
    }
  }, [mentee.id, setLatestTranscriptDate, transcriptRes]);

  const transcriptTextAndColors = transcriptRes.map(t => 
    getDateTextAndColor(t.data, 45, 60, "尚未通话"));

  const displayedMentorships = mentorships
    .filter(m => !isEndedTransactionalMentorship(m));

  const coachesRes = trpcNext.useQueries(t => {
    return displayedMentorships.map(
      m => t.users.getMentorCoach({ userId: m.mentor.id }));
  });

  const refetchAll = () => {
    refetch();
    coachesRes.map(c => void c.refetch());
  };

  const [editing, setEditing] = useState<boolean>(false);

  const LinkToEditor = ({ children, ...props }: LinkProps) =>
    readonly ? <>{children}</> : <Link {...props}>{children}</Link>;

  useEffect(() => {
    if (!addPinyin) return;
    const names = [
      ...mentorships.map(m => m.mentor.name),
      ...coachesRes.map(c => c.data ? c.data.name : null),
    ].filter(n => n !== null);
    addPinyin(names as string[]);
  }, [mentorships, coachesRes, addPinyin]);

  return <>
    {/* 导师 */}
    <Td>
      {editing && <MentorshipsEditor
        mentee={mentee} mentorships={mentorships}
        onClose={() => setEditing(false)} refetch={refetchAll}
      />}

      <LinkToEditor onClick={() => setEditing(true)}>
        {displayedMentorships.length ?
          <VStack align="start">
            {displayedMentorships.map(m =>
              <Flex key={m.id} gap={1}>
                <MentorshipStatusIcon m={m} />
                {formatUserName(m.mentor.name)}
              </Flex>)
            }
          </VStack>
          :
          <MdEdit />
        }
      </LinkToEditor>
    </Td>

    {/* 资深导师 */}
    {showCoach && <Td><VStack align="start">
      {coachesRes.map((c, idx) => <Text key={idx}>
        {c.data ? formatUserName(c.data.name) : "-"}
      </Text>)}
    </VStack></Td>}

    {/* 最近师生通话 */}
    <Td><VStack align="start">
      {transcriptTextAndColors.map((ttc, idx) =>
        <Text key={idx} color={ttc[1]}>{ttc[0]}</Text>
      )}
    </VStack></Td>
  </>;
}

export function LatestMentorMeetingDateCell({ menteeId, setData } : {
  menteeId : string,
  setData?: (userId: string, date: string) => void
}) {
  const { data: date } = trpcNext.chat.getLatestMessageCreatedAt.useQuery({ 
    menteeId,
    prefix: mentorMeetingMessagePrefix,
  });

  useEffect(() => {
    if (setData && date) setData(menteeId, date);
  }, [date, menteeId, setData]);

  const textAndColor = getDateTextAndColor(date, 60, 90, "尚未交流");
  return <Td color={textAndColor[1]}>{textAndColor[0]}</Td>;
}

/**
 * @param date undefined if it's still being fetched.
 */
export function getDateTextAndColor(date: string | null | undefined,
  yellowThreshold: number, redThreshold: number, nullText: string) {
  let text;
  let color;
  if (date) {
    text = prettifyDate(date);
    const daysAgo = moment().diff(date, "days");
    color = daysAgo < yellowThreshold ? "green" :
      daysAgo < redThreshold ? "yellow.600" : "brown";
  } else if (date === null) {
    text = nullText;
    color = "grey";
  }
  return [text, color];
}

function newTransactionalMentorshipEndsAt(): Date {
  return moment().add(2, 'weeks').toDate();
}

export function mentorshipStatusIconType(m: Mentorship) {
  return !m.endsAt ? undefined :
    compareDate(m.endsAt, new Date()) > 0 ?
      m.transactional ? TbClockOff : PiFlagCheckeredFill
    :
    m.transactional ? TbClock : undefined;
}

export function MentorshipStatusIcon({ m }: { m: Mentorship }) {
  const type = mentorshipStatusIconType(m);
  return type ? <Icon as={type} /> : <></>;
}

type ConfirmationModelProps = {
  message: string,
  confirm: () => void,
};

function MentorshipsEditor({ mentee, mentorships, refetch, onClose }: {
  mentee: MinUser,
  mentorships: Mentorship[],
  refetch: () => void,
  onClose: () => void,
}) {
  const [creating, setCreating] = useState<boolean>(false);
  const [confirmationModelProps, setConfirmationModelProps] =
    useState<ConfirmationModelProps>();

  const updateMentorship = async (
    mentorshipId: string,
    transactional: boolean,
    endsAt: Date | null
  ) => {
    await trpc.mentorships.update.mutate({
      mentorshipId,
      transactional,
      endsAt: endsAt?.toISOString() ?? null,
    });
    refetch();
  };

  /*
   * Display format:
  *
   * 类型    状态              操作
   * ----------------------------------------------------------
   * 不定期  将于<结束日期>结束  [立即结束] [延期结束] [转成一对一]
   * 不定期  已于<结束日期>结束  [重新开始] [转成一对一]
   * 一对一  已于<结束日期>结束  [重新开始]
   * 一对一  进行中             [立即结束]
   */
  return <ModalWithBackdrop isOpen size="4xl" onClose={onClose}>
    <ModalContent>
      <ModalHeader>{formatUserName(mentee.name)}的导师</ModalHeader>
      <ModalCloseButton />
      <ModalBody><TableContainer><Table>
        <Thead>
          <Tr>
            <Th>导师</Th>
            <Th>类型</Th>
            <Th>状态</Th>
            <Th>操作</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mentorships.map(m => {
            return <Tr key={m.id}>                  
              {/* 导师 */}
              <Td>{formatUserName(m.mentor.name)}</Td>

              {/* 类型 */}
              <Td>{m.transactional ? "不定期" : "一对一"}</Td>

              {/* 状态 */}
              <Td>
                {!m.endsAt ? "进行中" :
                  compareDate(m.endsAt, new Date()) > 0 ?
                  <HStack>
                    <MentorshipStatusIcon m={m} />
                    <Text>已于{prettifyDate(m.endsAt)}结束</Text>
                  </HStack>
                  :
                  <HStack>
                    <MentorshipStatusIcon m={m} />
                    <Text>将于{prettifyDate(m.endsAt)}结束</Text>
                  </HStack>
                }
              </Td>

              {/* 操作 */}
              <Td><HStack spacing={6}>
                {m.transactional ? <>
                  {/* 不定期 */}
                  {m.endsAt && compareDate(m.endsAt, new Date()) > 0 ? 
                    <Link onClick={() => setConfirmationModelProps({
                      message: "确定重新开始吗？",
                      confirm: () => updateMentorship(m.id, true, 
                        newTransactionalMentorshipEndsAt())
                    })}>重新开始</Link>
                    :
                    <>
                      <Link onClick={() => setConfirmationModelProps({
                        message: "确定立即结束吗？",
                        confirm: () => updateMentorship(m.id, true,
                          moment().subtract(1, 'minutes').toDate())
                      })}>立即结束</Link>

                      <Link onClick={() => setConfirmationModelProps({
                        message: "确定延期结束吗？",
                        confirm: () => updateMentorship(m.id, true,
                          newTransactionalMentorshipEndsAt())
                      })}>延期结束</Link>
                    </>
                  }

                  <Link onClick={() => setConfirmationModelProps({
                    message: "确定转成一对一吗？【注意】导师无法从一对一转回不定期。",
                    confirm: () => updateMentorship(m.id, false, null)
                  })}>转成一对一</Link>
                </>
                : 
                <>
                  {/* 一对一 */}
                  {m.endsAt && compareDate(m.endsAt, new Date()) > 0 ? 
                    <Link onClick={() => setConfirmationModelProps({
                      message: "确定重新开始吗？",
                      confirm: () => updateMentorship(m.id, false, null)
                    })}>重新开始</Link>
                    :
                    <Link onClick={() => setConfirmationModelProps({
                      message: "确定立即结束吗？",
                      confirm: () => updateMentorship(m.id, false,
                        moment().subtract(1, 'minutes').toDate())
                    })}>立即结束</Link>
                  }
                </>}
              </HStack></Td>
            </Tr>;
          })}
        </Tbody>
      </Table></TableContainer></ModalBody>

      {confirmationModelProps && <ConfirmationModal
        {...confirmationModelProps} close={() => setConfirmationModelProps(undefined)} />}

      <ModalFooter>
        {creating && <MentorshipCreator menteeId={mentee.id} refetch={refetch}
          onClose={() => setCreating(false)}/>}
        <Button variant="brand" onClick={() => setCreating(true)} 
          leftIcon={<AddIcon />}>增加导师</Button>
        <Spacer />
        <Button onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}

function MentorshipCreator({ menteeId, refetch, onClose }: { 
  menteeId: string,
  refetch: () => void,
  onClose: () => void,
}) {
  const save = async (mentorId: string) => {
    invariant(menteeId);
    invariant(mentorId);
    await trpc.mentorships.create.mutate({
      mentorId,
      menteeId,
      // Always start from transactional mentorships.
      transactional: true,
      endsAt: newTransactionalMentorshipEndsAt().toISOString(),
    });
    onClose();
    refetch();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>增加导师</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <FormControl>
          <UserSelector onSelect={
            userIds => userIds.length && save(userIds[0])
          } />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>取消</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
