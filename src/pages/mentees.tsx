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
  WrapItem,
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
  Checkbox,
  Tooltip,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import trpc, { trpcNext } from "../trpc";
import User, { MinUser, UserFilter } from 'shared/User';
import { formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import Loader from 'components/Loader';
import UserFilterSelector from 'components/UserFilterSelector';
import MenteeStatusSelect from 'components/MenteeStatusSelect';
import invariant from 'tiny-invariant';
import { MenteeStatus } from 'shared/MenteeStatus';
import NextLink from "next/link";
import { AddIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { PiFlagCheckeredFill } from "react-icons/pi";
import moment from "moment";
import { Mentorship } from 'shared/Mentorship';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import UserSelector from 'components/UserSelector';
import { MdEdit } from 'react-icons/md';
import { sectionSpacing } from 'theme/metrics';
import { formatMentorshipEndedAtText } from './mentees/[userId]';
import { menteeAcceptanceYearField } from 'shared/menteeApplicationFields';

const fixedFilter: UserFilter = { containsRoles: ["Mentee"] };

export default function Page() {
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
};

function MenteeTable({ users, refetch }: {
  users: User[],
  refetch: () => void
}) {
  const applications = trpcNext.useQueries(t => {
    return users.map(user => t.users.getApplicant({ userId: user.id, type: 'MenteeInterview' }));
  });

  const rows = users.map((user, idx) => {
    const application = applications[idx]?.data?.application;
    const year = (application as Record<string, any>)?.[menteeAcceptanceYearField];
    return application ? {
      year,
      user,
    } : null;
  }).sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    if (a.year != b.year) return b.year - a.year;

    if (!a.user.name) return 1;
    if (!b.user.name) return -1;
    return a.user.name.localeCompare(b.user.name);
  });

  return <Table size="sm">
    <Thead>
      <Tr>
        <Th>状态</Th>
        <Th>录取届</Th>
        <Th>姓名</Th>
        <Th>导师</Th>
        <Th>资深导师</Th>
        <Th>最近师生通话</Th>
        <Th>最近内部笔记</Th>
        <Th>拼音（便于查找）</Th>
      </Tr>
    </Thead>
    <Tbody>
      {rows.map((row) => row ?
        <MenteeRow key={row.user.id} user={row.user} year={row.year} refetch={refetch} />
        : null)
      }
    </Tbody>
  </Table>;
}

function MenteeRow({ user: u, year, refetch }: {
  user: User,
  year: any,
  refetch: () => void
}) {
  const menteePinyin = toPinyin(u.name ?? '');
  const [pinyin, setPinyins] = useState(menteePinyin);

  const setStatus = async (menteeStatus: MenteeStatus | null | undefined) => {
    invariant(menteeStatus !== undefined);
    await trpc.users.updateMenteeStatus.mutate({ userId: u.id, menteeStatus });
    refetch();
  };

  const addPinyin = useCallback((names: string[]) => {
    if (names.length) {
      setPinyins(`${menteePinyin},${names.map(n => toPinyin(n)).join(',')}`);
    }
  }, [menteePinyin]);

  return <Tr key={u.id} _hover={{ bg: "white" }}>
    {/* 状态 */}
    <Td><Wrap minWidth="110px"><WrapItem>
      <MenteeStatusSelect value={u.menteeStatus}
        size="sm" onChange={status => setStatus(status)} />
    </WrapItem></Wrap></Td>

    <MenteeCells mentee={u} year={year} />

    <MentorshipCells menteeId={u.id} addPinyin={addPinyin} showCoach />

    {/* 最近内部笔记 */}
    <MostRecentChatMessageCell menteeId={u.id} />

    {/* 拼音 */}
    <Td>{pinyin}</Td>
  </Tr>;
}

export function MenteeCells({ mentee, year }: {
  mentee: MinUser,
  year: any
}) {
  return <>
    <Td>{year && year}</Td>
    <Td><Link as={NextLink} href={`/mentees/${mentee.id}`}>
      {mentee.name} <ChevronRightIcon />
    </Link></Td>
  </>;
}

export function MentorshipCells({ menteeId, addPinyin, showCoach, readonly }: {
  menteeId: string,
  addPinyin?: (names: string[]) => void,
  showCoach?: boolean,
  readonly?: boolean,
}) {
  const { data, refetch } = trpcNext.mentorships.listForMentee.useQuery(menteeId);
  if (!data) return <Td><Loader /></Td>;

  // Stablize list order
  data.sort((a, b) => a.id.localeCompare(b.id));

  return <LoadedMentorsCells menteeId={menteeId} mentorships={data}
    addPinyin={addPinyin} refetch={refetch} showCoach={showCoach}
    readonly={readonly} />;
}

function LoadedMentorsCells({
  menteeId, mentorships, addPinyin, refetch, showCoach, readonly
}: {
  menteeId: string,
  mentorships: Mentorship[],
  addPinyin?: (names: string[]) => void,
  refetch: () => void,
  showCoach?: boolean,
  readonly?: boolean,
}) {
  const transcriptRes = trpcNext.useQueries(t => {
    return mentorships.map(m => t.transcripts.getMostRecentStartedAt({
      groupId: m.group.id
    }));
  });
  const transcriptTextAndColors = transcriptRes.map(t =>
    getDateTextAndColor(t.data, 45, 60, "尚未通话"));

  const coachRes = trpcNext.useQueries(t => {
    return mentorships.map(m => t.users.getMentorCoach({ userId: m.mentor.id }));
  });

  const refetchAll = () => {
    refetch();
    coachRes.map(c => void c.refetch());
  };

  const [editing, setEditing] = useState<boolean>(false);

  const LinkToEditor = ({ children, ...props }: LinkProps) =>
    readonly ? <>{children}</> : <Link {...props}>{children}</Link>;

  useEffect(() => {
    if (!addPinyin) return;
    const names = [
      ...mentorships.map(m => m.mentor.name),
      ...coachRes.map(c => c.data ? c.data.name : null),
    ].filter(n => n !== null);
    addPinyin(names as string[]);
  }, [mentorships, coachRes, addPinyin]);

  return <>
    {/* 导师 */}
    <Td>
      {editing && <MentorshipsEditor
        menteeId={menteeId} mentorships={mentorships}
        coaches={coachRes.map(c => c.data === undefined ? null : c.data)}
        onClose={() => setEditing(false)} refetch={refetchAll}
      />}

      <LinkToEditor onClick={() => setEditing(true)}>
        {mentorships.length ?
          <VStack align="start">
            {mentorships.map(m =>
              <Flex key={m.id} gap={1}>
                {m.endedAt !== null &&
                  <Tooltip label={formatMentorshipEndedAtText(m.endedAt)}>
                    <PiFlagCheckeredFill />
                  </Tooltip>
                }

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
    {showCoach &&
      <Td><LinkToEditor onClick={() => setEditing(true)}><VStack align="start">
        {coachRes.map((c, idx) => c.data ?
          <Text key={idx}>{formatUserName(c.data.name)}</Text> :
          <MdEdit key={idx} />
        )}
      </VStack></LinkToEditor></Td>
    }

    {/* 最近师生通话 */}
    <Td><VStack align="start">
      {transcriptTextAndColors.map((ttc, idx) =>
        <Text key={idx} color={ttc[1]}>{ttc[0]}</Text>
      )}
    </VStack></Td>
  </>;
}

export function MostRecentChatMessageCell({ menteeId }: {
  menteeId: string
}) {
  const { data } = trpcNext.chat.getMostRecentMessageUpdatedAt
    .useQuery({ menteeId });
  const textAndColor = getDateTextAndColor(data, 60, 90, "无笔记");
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

function MentorshipsEditor({ menteeId, mentorships, coaches, refetch, onClose }: {
  menteeId: string,
  mentorships: Mentorship[],
  coaches: (MinUser | null)[],
  refetch: () => void,
  onClose: () => void,
}) {
  invariant(mentorships.length == coaches.length);
  const [creating, setCreating] = useState<boolean>(false);

  const saveCoach = async (mentorId: string, coachIds: string[]) => {
    // TODO: allow removing coaches
    if (coachIds.length == 0) return;
    await trpc.users.setMentorCoach.mutate({
      userId: mentorId,
      coachId: coachIds[0],
    });
    refetch();
  };

  const updateMentorship = async (mentorshipId: string, ended: boolean) => {
    await trpc.mentorships.update.mutate({
      mentorshipId,
      endedAt: ended ? new Date().toISOString() : null,
    });
    refetch();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>一对一匹配</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>已结束</Th>
                <Th>导师</Th>
                <Th>资深导师</Th>
              </Tr>
            </Thead>
            <Tbody>
              {mentorships.map((m: Mentorship, idx) => {
                const coach: MinUser | null = coaches[idx];
                return <Tr key={m.id}>
                  <Td>
                    <Checkbox isChecked={m.endedAt !== null}
                      onChange={ev => updateMentorship(m.id, ev.target.checked)}
                    />
                  </Td>
                  <Td>{formatUserName(m.mentor.name)}</Td>
                  <Td>
                    <UserSelector initialValue={coach ? [coach] : []}
                      onSelect={userIds => saveCoach(m.mentor.id, userIds)}
                    />
                  </Td>
                </Tr>;
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </ModalBody>
      <ModalFooter>
        {creating && <MentorshipCreator menteeId={menteeId} refetch={refetch}
          onClose={() => setCreating(false)} />}
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
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      invariant(menteeId);
      invariant(mentorId);
      await trpc.mentorships.create.mutate({ mentorId, menteeId });
      refetch();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>增加一对一导师</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <FormControl>
          <UserSelector onSelect={
            userIds => setMentorId(userIds.length ? userIds[0] : null)} />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand'
          isDisabled={!mentorId}
          isLoading={saving} onClick={save}>增加</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
