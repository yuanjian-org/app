import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  TableContainer,
  Link,
  Text,
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  VStack,
  Spacer,
  Tag,
  HStack,
  Icon,
  Box,
  LinkProps,
  WrapItem,
  Wrap,
  Checkbox,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import trpc, { trpcNext } from "../trpc";
import User, { MinUser } from "shared/User";
import { UserFilter } from "shared/UserFilter";
import {
  compareChinese,
  compareDate,
  formatUserName,
  getColorFromText,
  prettifyDate,
  toPinyin,
} from "shared/strings";
import Loader from "components/Loader";
import UserFilterSelector from "components/UserFilterSelector";
import { MenteeStatusSelectCell } from "components/MenteeStatusSelect";
import invariant from "tiny-invariant";
import NextLink from "next/link";
import { AddIcon, ChevronRightIcon } from "@chakra-ui/icons";
import moment from "moment";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { MdEdit } from "react-icons/md";
import { pageMarginX, sectionSpacing } from "theme/metrics";
import {
  PointOfContactCells,
  PointOfContactHeaderCells,
} from "components/pointOfContactCells";
import { fullPage } from "AppPage";
import ConfirmationModal, {
  ConfirmationModelProps,
} from "components/ConfirmationModal";
import { FaAngleDoubleUp, FaAngleDoubleDown } from "react-icons/fa";
import { LuChevronsUpDown } from "react-icons/lu";
import { topBarPaddings } from "components/TopBar";
import TopBar from "components/TopBar";
import UserSelector from "components/UserSelector";
import {
  menteeReviewMessagePrefix,
  mentorReviewMessagePrefix,
} from "shared/ChatMessage";
import { TbClockOff, TbClock } from "react-icons/tb";
import { MenteeStatus } from "shared/MenteeStatus";
import {
  Mentorship,
  isOngoingRelationalMentorship,
  reviewRedThreshold,
  reviewYellowThreshold,
  newTransactionalMentorshipEndsAt,
  oneOnOneRedThreshold,
  oneOnOneYellowThreshold,
} from "shared/Mentorship";
import {
  menteeAcceptanceYearField,
  menteeSourceField,
} from "shared/applicationFields";
import {
  okTextColor,
  warningTextColor,
  actionRequiredTextColor,
} from "theme/colors";
import { PiFlagCheckeredFill } from "react-icons/pi";
import { MatchFeedbackStateCell } from "./mentors/manage";
import { DownloadIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip } from "@chakra-ui/react";
import { toast } from "react-toastify";
import useMe from "useMe";
import { isPermitted } from "shared/Role";
import useStaticGlobalConfigs from "components/useStaticGlobalConfigs";
import { getAnonymousId } from "shared/getAnonymousId";

type SortOrderKey =
  | "year"
  | "source"
  | "name"
  | "mentorReview"
  | "menteeReview"
  | "transcript";
type SortOrderDir = "asc" | "desc";

type SortOrder = {
  key: SortOrderKey;
  dir: SortOrderDir;
}[];

const title = "学生档案";

export default fullPage(() => {
  const { data: config } = useStaticGlobalConfigs();
  const isDemo = config?.isDemo;
  const fixedFilter: UserFilter = {
    containsRoles: ["Mentee"],
    includeNonVolunteers: true,
  };

  const [filter, setFilter] = useState<UserFilter>(fixedFilter);
  const [showMatchState, setShowMatchState] = useState(false);
  const me = useMe();

  const { data: users, refetch } = trpcNext.users.list.useQuery(filter);

  return (
    <>
      <TopBar {...topBarPaddings()}>
        <Wrap spacing={sectionSpacing} align="center">
          <WrapItem>
            <UserFilterSelector
              filter={filter}
              fixedFilter={fixedFilter}
              onChange={(f) => setFilter(f)}
            />
          </WrapItem>
          <WrapItem>
            <Checkbox
              isChecked={showMatchState}
              onChange={(e) => setShowMatchState(e.target.checked)}
            >
              显示师生匹配状态
            </Checkbox>
          </WrapItem>
        </Wrap>
      </TopBar>

      <Box mx={pageMarginX} mt={pageMarginX}>
        {!users ? (
          <Loader />
        ) : (
          <TableContainer>
            <MenteeTable
              users={users}
              showMatchState={showMatchState}
              refetch={refetch}
              isDemo={isDemo}
              isUserManager={isPermitted(me.roles, "UserManager")}
            />
            <Text fontSize="sm" color="gray" marginTop={sectionSpacing}>
              共 <b>{users.length}</b> 名
            </Text>
          </TableContainer>
        )}
      </Box>
    </>
  );
}, title);

function MenteeTable({
  users,
  refetch,
  showMatchState,
  isDemo,
  isUserManager,
}: {
  users: User[];
  refetch: () => void;
  showMatchState: boolean;
  isDemo?: boolean;
  isUserManager: boolean;
}) {
  const [mentee2year, setMentee2year] = useState<Record<string, string>>({});
  const setYear = useCallback((userId: string, year: string) => {
    setMentee2year((current) => ({ ...current, [userId]: year }));
  }, []);

  const [mentee2source, setMentee2source] = useState<Record<string, string>>(
    {},
  );
  const setSource = useCallback((userId: string, source: string) => {
    setMentee2source((current) => ({ ...current, [userId]: source }));
  }, []);

  const [mentee2mentorReview, setMentee2mentorReview] = useState<
    Record<string, string>
  >({});
  const setLastMentorReviewDate = useCallback(
    (userId: string, date: string) => {
      setMentee2mentorReview((current) => ({
        ...current,
        [userId]: date,
      }));
    },
    [],
  );

  const [mentee2menteeReview, setMentee2menteeReview] = useState<
    Record<string, string>
  >({});
  const setLastMenteeReviewDate = useCallback(
    (userId: string, date: string) => {
      setMentee2menteeReview((current) => ({
        ...current,
        [userId]: date,
      }));
    },
    [],
  );

  const [mentee2lastMeeting, setMentee2lastMeeting] = useState<
    Record<string, string>
  >({});
  const setLastMeetingStartedAt = useCallback(
    (userId: string, date: string) => {
      setMentee2lastMeeting((current) => ({
        ...current,
        [userId]: date,
      }));
    },
    [],
  );

  const defaultSortOrder: SortOrder = [
    { key: "year", dir: "desc" },
    { key: "source", dir: "asc" },
    { key: "name", dir: "asc" },
  ];
  const sortOrderLength = defaultSortOrder.length;

  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const addSortOrder = useCallback(
    (key: SortOrderKey, dir: SortOrderDir) => {
      setSortOrder([
        { key, dir },
        ...sortOrder.filter((o) => o.key !== key).slice(0, sortOrderLength - 1),
      ]);
    },
    [sortOrder, sortOrderLength],
  );

  const sortUser = useCallback(
    (a: MinUser, b: MinUser) => {
      for (const order of sortOrder) {
        let comp = 0;
        const sign = order.dir === "asc" ? 1 : -1;
        switch (order.key) {
          case "year":
            comp = (mentee2year[a.id] ?? "").localeCompare(
              mentee2year[b.id] ?? "",
            );
            if (comp !== 0) return sign * comp;
            break;

          case "source":
            comp = compareChinese(
              mentee2source[a.id] ?? "",
              mentee2source[b.id] ?? "",
            );
            if (comp !== 0) return sign * comp;
            break;

          case "name":
            comp = compareChinese(a.name, b.name);
            if (comp !== 0) return sign * comp;
            break;

          case "mentorReview":
            comp = compareDate(
              mentee2mentorReview[a.id],
              mentee2mentorReview[b.id],
            );
            if (comp !== 0) return sign * comp;
            break;

          case "menteeReview":
            comp = compareDate(
              mentee2menteeReview[a.id],
              mentee2menteeReview[b.id],
            );
            if (comp !== 0) return sign * comp;
            break;

          case "transcript":
            comp = compareDate(
              mentee2lastMeeting[a.id],
              mentee2lastMeeting[b.id],
            );
            if (comp !== 0) return sign * comp;
            break;
        }
      }
      // Fall back to id comparison
      return a.id.localeCompare(b.id);
    },
    [
      mentee2mentorReview,
      mentee2menteeReview,
      mentee2lastMeeting,
      mentee2year,
      mentee2source,
      sortOrder,
    ],
  );

  const sortedUsers = useMemo(() => {
    return users.sort(sortUser);
  }, [users, sortUser]);

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>状态</Th>
          <PointOfContactHeaderCells />
          <MenteeHeaderCells
            sortOrder={sortOrder}
            addSortOrder={addSortOrder}
          />

          {showMatchState && (
            <>
              <Th color="brand.c">导师选择状态</Th>
              <Th color="brand.c">交流反馈状态</Th>
            </>
          )}

          {!isDemo && isUserManager && (
            <>
              <Th>下载</Th>
              <Th>匿名 ID</Th>
            </>
          )}

          <Th>导师</Th>
          <SortableHeaderCell
            label="最近一对一"
            sortOrderKey="transcript"
            sortOrder={sortOrder}
            addSortOrder={addSortOrder}
          />
          <SortableHeaderCell
            label="最近学生访谈"
            sortOrderKey="menteeReview"
            sortOrder={sortOrder}
            addSortOrder={addSortOrder}
          />
          <SortableHeaderCell
            label="最近导师访谈"
            sortOrderKey="mentorReview"
            sortOrder={sortOrder}
            addSortOrder={addSortOrder}
          />
          <Th>拼音（便于查找）</Th>
        </Tr>
      </Thead>

      <Tbody>
        {sortedUsers.map((u) => (
          <MenteeRow
            key={u.id}
            user={u}
            refetch={refetch}
            setYear={setYear}
            setSource={setSource}
            setLastMenteeReviewDate={setLastMenteeReviewDate}
            setLastMentorReviewDate={setLastMentorReviewDate}
            setLastMeetingStartedAt={setLastMeetingStartedAt}
            showMatchState={showMatchState}
            isDemo={isDemo}
            isUserManager={isUserManager}
            year={mentee2year[u.id]}
          />
        ))}
      </Tbody>
    </Table>
  );
}

function SortableHeaderCell({
  label,
  sortOrderKey,
  sortOrder,
  addSortOrder,
}: {
  label: string;
  sortOrderKey: SortOrderKey;
  sortOrder: SortOrder;
  addSortOrder: (key: SortOrderKey, dir: SortOrderDir) => void;
}) {
  const idx = sortOrder.findIndex((o) => o.key === sortOrderKey);
  const dir = idx >= 0 ? sortOrder[idx].dir : undefined;

  return (
    <Th
      _hover={{ cursor: "pointer" }}
      onClick={() => addSortOrder(sortOrderKey, dir === "asc" ? "desc" : "asc")}
    >
      <HStack spacing={0.5}>
        <Text>{label}</Text>
        {idx >= 0 && dir === "asc" && <FaAngleDoubleUp color="gray" />}
        {idx >= 0 && dir === "desc" && <FaAngleDoubleDown color="gray" />}
        {idx >= 0 && (
          <Text color="gray">
            <sup>{idx + 1}</sup>
          </Text>
        )}
        {/* Use black and not gray for the icon because it's thinner than
          FaAngle* icons. */}
        {idx < 0 && <LuChevronsUpDown />}
      </HStack>
    </Th>
  );
}

function MenteeRow({
  user: u,
  refetch,
  setYear,
  setSource,
  setLastMenteeReviewDate,
  setLastMentorReviewDate,
  setLastMeetingStartedAt,
  showMatchState,
  isDemo,
  isUserManager,
  year,
}: {
  user: User;
  refetch: () => void;
  setYear: (userId: string, year: string) => void;
  setSource: (userId: string, source: string) => void;
  setLastMenteeReviewDate: (userId: string, date: string) => void;
  setLastMentorReviewDate: (userId: string, date: string) => void;
  setLastMeetingStartedAt: (userId: string, date: string) => void;
  showMatchState: boolean;
  isDemo?: boolean;
  isUserManager: boolean;
  year?: string;
}) {
  const menteePinyin = toPinyin(u.name ?? "");
  const [pinyin, setPinyins] = useState(menteePinyin);

  const saveStatus = async (menteeStatus: MenteeStatus | null | undefined) => {
    invariant(menteeStatus !== undefined);
    await trpc.users.setMenteeStatus.mutate({ userId: u.id, menteeStatus });
    refetch();
  };

  const addPinyin = useCallback(
    (names: string[]) => {
      if (names.length) {
        setPinyins(
          `${menteePinyin}, ${names.map((n) => toPinyin(n)).join(", ")}`,
        );
      }
    },
    [menteePinyin],
  );

  const downloadMenteeData = async (userId: string) => {
    const result = await trpc.menteeData.downloadMenteeData.query(userId);

    // Decode base64 and create a blob
    const byteCharacters = atob(result.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/zip" });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("学生数据下载成功");
  };

  return (
    <Tr key={u.id} _hover={{ bg: "white" }}>
      <MenteeStatusSelectCell status={u.menteeStatus} onChange={saveStatus} />
      <PointOfContactCells user={u} refetch={refetch} />
      <MenteeCells mentee={u} setYear={setYear} setSource={setSource} />

      {showMatchState && (
        <>
          <MentorSelectionStateCell menteeId={u.id} />
          <MenteeMatchFeedbackStateCell menteeId={u.id} />
        </>
      )}

      {!isDemo && isUserManager && (
        <>
          <Td>
            <Tooltip label="下载学生数据">
              <IconButton
                aria-label="下载学生数据"
                icon={<DownloadIcon />}
                size="sm"
                variant="ghost"
                onClick={() => downloadMenteeData(u.id)}
              />
            </Tooltip>
          </Td>
          <Td>{getAnonymousId(u.id, year || null)}</Td>
        </>
      )}

      <MentorshipCells
        mentee={u}
        addPinyin={addPinyin}
        setLastMeetingStartedAt={setLastMeetingStartedAt}
      />
      <LastReviewDateCell
        menteeId={u.id}
        prefix={menteeReviewMessagePrefix}
        setData={setLastMenteeReviewDate}
      />
      <LastReviewDateCell
        menteeId={u.id}
        prefix={mentorReviewMessagePrefix}
        setData={setLastMentorReviewDate}
      />
      <Td translate="no" className="notranslate">
        {pinyin}
      </Td>
    </Tr>
  );
}

function MenteeMatchFeedbackStateCell({ menteeId }: { menteeId: string }) {
  const { data } = trpcNext.matchFeedback.getLastMenteeMatchFeedback.useQuery({
    menteeId,
  });

  const total = data?.mentors.length ?? 0;
  const [scores, reasons] = data?.mentors.reduce(
    ([scores, reasons], m) => {
      if (m.score) scores += 1;
      if (m.reason) reasons += 1;
      return [scores, reasons];
    },
    [0, 0],
  ) ?? [0, 0];

  return (
    <MatchFeedbackStateCell
      loading={data === undefined}
      total={total}
      scores={scores}
      reasons={reasons}
    />
  );
}

function MenteeHeaderCells({
  sortOrder,
  addSortOrder,
}: {
  sortOrder: SortOrder;
  addSortOrder: (key: SortOrderKey, dir: SortOrderDir) => void;
}) {
  return (
    <>
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
    </>
  );
}

export function MenteeCells({
  mentee,
  setYear,
  setSource,
}: {
  mentee: MinUser;
  setYear?: (menteeId: string, year: string) => void;
  setSource?: (menteeId: string, source: string) => void;
}) {
  const { data } = trpcNext.users.getApplicant.useQuery({
    type: "MenteeInterview",
    userId: mentee.id,
  });

  const year = (data?.application as Record<string, any>)?.[
    menteeAcceptanceYearField
  ];

  const source = (data?.application as Record<string, any> | null)?.[
    menteeSourceField
  ];

  useEffect(() => {
    if (year) setYear?.(mentee.id, year);
    if (source) setSource?.(mentee.id, source);
  }, [mentee.id, year, source, setYear, setSource]);

  return (
    <>
      {/* Acceptance Year */}
      <Td>{year && <Tag colorScheme={getColorFromText(year)}>{year}</Tag>}</Td>

      {/* Source */}
      <Td>{source}</Td>

      {/* Name */}
      <Td>
        <Link as={NextLink} href={`/mentees/${mentee.id}`}>
          <b>{mentee.name}</b> <ChevronRightIcon />
        </Link>
      </Td>
    </>
  );
}

function MentorSelectionStateCell({ menteeId }: { menteeId: string }) {
  const { data } =
    trpcNext.mentorSelections.listLastBatchFinalizedAt.useQuery();
  const f = data?.find((d) => d.userId === menteeId)?.finalizedAt;
  return (
    <Td>
      {data === undefined ? (
        ""
      ) : f === undefined ? (
        <Text color={actionRequiredTextColor}>未选择</Text>
      ) : f === null ? (
        <Text color={warningTextColor}>草稿</Text>
      ) : (
        <Text color={okTextColor}>{prettifyDate(f)}完成</Text>
      )}
    </Td>
  );
}

export function MentorshipCells({
  mentee,
  addPinyin,
  readonly,
  setLastMeetingStartedAt,
}: {
  mentee: MinUser;
  addPinyin?: (names: string[]) => void;
  readonly?: boolean;
  setLastMeetingStartedAt?: (userId: string, date: string) => void;
}) {
  const { data, refetch } =
    trpcNext.mentorships.listMentorshipsForMentee.useQuery({
      menteeId: mentee.id,
      includeEndedTransactional: true,
    });
  if (!data)
    return (
      <Td>
        <Loader />
      </Td>
    );

  // Stablize list order
  data.sort((a, b) => a.id.localeCompare(b.id));

  return (
    <LoadedMentorsCells
      mentee={mentee}
      mentorships={data}
      addPinyin={addPinyin}
      refetch={refetch}
      readonly={readonly}
      setLastMeetingStartedAt={setLastMeetingStartedAt}
    />
  );
}

function LoadedMentorsCells({
  mentee,
  mentorships,
  addPinyin,
  refetch,
  readonly,
  setLastMeetingStartedAt,
}: {
  mentee: MinUser;
  mentorships: Mentorship[];
  addPinyin?: (names: string[]) => void;
  refetch: () => void;
  readonly?: boolean;
  setLastMeetingStartedAt?: (userId: string, date: string) => void;
}) {
  const visibleMentorships = mentorships.filter((m) =>
    isOngoingRelationalMentorship(m),
  );

  const lastMeetingsRes = trpcNext.useQueries((t) => {
    return visibleMentorships.map((m) =>
      t.mentorships.getLastMeetingStartedAt({
        mentorshipId: m.id,
      }),
    );
  });
  const lastMeetingsData = lastMeetingsRes.map((l) => l.data);

  useEffect(() => {
    if (!setLastMeetingStartedAt) return;

    const earliest = moment(0).toISOString();
    const last = lastMeetingsData.reduce((last, data) => {
      if (data && compareDate(last, data) < 0) return data;
      return last;
    }, earliest);
    invariant(last);
    if (last !== earliest) setLastMeetingStartedAt(mentee.id, last);

    // https://stackoverflow.com/a/59468261
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentee.id, setLastMeetingStartedAt, JSON.stringify(lastMeetingsData)]);

  const transcriptTextAndColors = lastMeetingsData.map((t) =>
    getDateTextAndColor(
      t,
      oneOnOneYellowThreshold,
      oneOnOneRedThreshold,
      "尚未通话",
    ),
  );

  const [editing, setEditing] = useState<boolean>(false);

  const LinkToEditor = ({ children, ...props }: LinkProps) =>
    readonly ? <>{children}</> : <Link {...props}>{children}</Link>;

  useEffect(() => {
    if (addPinyin) {
      addPinyin(
        visibleMentorships
          .map((m) => m.mentor.name)
          .filter((n) => n !== null) as string[],
      );
    }
  }, [visibleMentorships, addPinyin]);

  return (
    <>
      {/* 导师 */}
      <Td>
        {editing && (
          <MentorshipsEditor
            mentee={mentee}
            mentorships={mentorships}
            refetch={refetch}
            onClose={() => setEditing(false)}
          />
        )}

        <LinkToEditor onClick={() => setEditing(true)}>
          {visibleMentorships.length ? (
            <VStack align="start">
              {visibleMentorships.map((m) => (
                <Flex key={m.id} gap={1}>
                  <MentorshipStatusIcon m={m} />
                  {formatUserName(m.mentor.name)}
                </Flex>
              ))}
            </VStack>
          ) : (
            <MdEdit />
          )}
        </LinkToEditor>
      </Td>

      {/* 最近师生通话 */}
      <Td>
        <VStack align="start">
          {transcriptTextAndColors.map((ttc, idx) => (
            <Text key={idx} color={ttc[1]}>
              {ttc[0]}
            </Text>
          ))}
        </VStack>
      </Td>
    </>
  );
}

function LastReviewDateCell({
  menteeId,
  prefix,
  setData,
}: {
  menteeId: string;
  prefix: typeof menteeReviewMessagePrefix | typeof mentorReviewMessagePrefix;
  setData?: (userId: string, date: string) => void;
}) {
  const { data: date } = trpcNext.chat.getLastMessageCreatedAt.useQuery({
    menteeId,
    prefix,
  });

  useEffect(() => {
    if (setData && date) setData(menteeId, date);
  }, [date, menteeId, setData]);

  const textAndColor = getDateTextAndColor(
    date,
    reviewYellowThreshold,
    reviewRedThreshold,
    "尚未访谈",
  );
  return <Td color={textAndColor[1]}>{textAndColor[0]}</Td>;
}

/**
 * @param date undefined if it's still being fetched.
 */
export function getDateTextAndColor(
  date: string | null | undefined,
  yellowThreshold: number,
  redThreshold: number,
  nullText: string,
) {
  let text;
  let color;
  if (date) {
    text = prettifyDate(date);
    const daysAgo = moment().diff(date, "days");
    color =
      daysAgo < yellowThreshold
        ? okTextColor
        : daysAgo < redThreshold
          ? warningTextColor
          : actionRequiredTextColor;
  } else if (date === null) {
    text = nullText;
    color = "gray";
  }
  return [text, color];
}

export function mentorshipStatusIconType(m: Mentorship) {
  return !m.endsAt
    ? undefined
    : compareDate(m.endsAt, new Date()) < 0
      ? m.transactional
        ? TbClockOff
        : PiFlagCheckeredFill
      : m.transactional
        ? TbClock
        : undefined;
}

export function MentorshipStatusIcon({ m }: { m: Mentorship }) {
  const type = mentorshipStatusIconType(m);
  return type ? <Icon as={type} /> : <></>;
}

type PartialConfirmationModelProps = Omit<ConfirmationModelProps, "onClose">;

function MentorshipsEditor({
  mentee,
  mentorships,
  refetch,
  onClose,
}: {
  mentee: MinUser;
  mentorships: Mentorship[];
  refetch: () => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState<boolean>(false);
  const [confirmationModelProps, setConfirmationModelProps] =
    useState<PartialConfirmationModelProps>();

  const updateMentorship = async (
    mentorshipId: string,
    transactional: boolean,
    endsAt: Date | null,
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
  return (
    <ModalWithBackdrop isOpen size="4xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>{formatUserName(mentee.name)}的导师</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>导师</Th>
                  <Th>类型</Th>
                  <Th>状态</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {mentorships.map((m) => {
                  return (
                    <Tr key={m.id}>
                      {/* 导师 */}
                      <Td>{formatUserName(m.mentor.name)}</Td>

                      {/* 类型 */}
                      <Td>{m.transactional ? "不定期" : "一对一"}</Td>

                      {/* 状态 */}
                      <Td>
                        {!m.endsAt ? (
                          "进行中"
                        ) : compareDate(m.endsAt, new Date()) < 0 ? (
                          <HStack>
                            <MentorshipStatusIcon m={m} />
                            <Text>已于{prettifyDate(m.endsAt)}结束</Text>
                          </HStack>
                        ) : (
                          <HStack>
                            <MentorshipStatusIcon m={m} />
                            <Text>将于{prettifyDate(m.endsAt)}结束</Text>
                          </HStack>
                        )}
                      </Td>

                      {/* 操作 */}
                      <Td>
                        <HStack spacing={6}>
                          {m.transactional ? (
                            <>
                              {/* 不定期 */}
                              {m.endsAt &&
                              compareDate(m.endsAt, new Date()) < 0 ? (
                                <Link
                                  onClick={() =>
                                    setConfirmationModelProps({
                                      message: "确定重新开始吗？",
                                      onConfirm: () =>
                                        updateMentorship(
                                          m.id,
                                          true,
                                          newTransactionalMentorshipEndsAt(),
                                        ),
                                    })
                                  }
                                >
                                  重新开始
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    onClick={() =>
                                      setConfirmationModelProps({
                                        message: "确定立即结束吗？",
                                        onConfirm: () =>
                                          updateMentorship(
                                            m.id,
                                            true,
                                            moment()
                                              .subtract(1, "minutes")
                                              .toDate(),
                                          ),
                                      })
                                    }
                                  >
                                    立即结束
                                  </Link>

                                  <Link
                                    onClick={() =>
                                      setConfirmationModelProps({
                                        message: "确定延期结束吗？",
                                        onConfirm: () =>
                                          updateMentorship(
                                            m.id,
                                            true,
                                            newTransactionalMentorshipEndsAt(),
                                          ),
                                      })
                                    }
                                  >
                                    延期结束
                                  </Link>
                                </>
                              )}

                              <Link
                                onClick={() =>
                                  setConfirmationModelProps({
                                    message:
                                      "确定转成一对一吗？【注意】导师无法从一对一转回不定期。",
                                    onConfirm: () =>
                                      updateMentorship(m.id, false, null),
                                  })
                                }
                              >
                                转成一对一
                              </Link>
                            </>
                          ) : (
                            <>
                              {/* 一对一 */}
                              {m.endsAt &&
                              compareDate(m.endsAt, new Date()) < 0 ? (
                                <Link
                                  onClick={() =>
                                    setConfirmationModelProps({
                                      message: "确定重新开始吗？",
                                      onConfirm: () =>
                                        updateMentorship(m.id, false, null),
                                    })
                                  }
                                >
                                  重新开始
                                </Link>
                              ) : (
                                <Link
                                  onClick={() =>
                                    setConfirmationModelProps({
                                      message: "确定立即结束吗？",
                                      onConfirm: () =>
                                        updateMentorship(
                                          m.id,
                                          false,
                                          moment()
                                            .subtract(1, "minutes")
                                            .toDate(),
                                        ),
                                    })
                                  }
                                >
                                  立即结束
                                </Link>
                              )}
                            </>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </ModalBody>

        {confirmationModelProps && (
          <ConfirmationModal
            {...confirmationModelProps}
            onClose={() => setConfirmationModelProps(undefined)}
          />
        )}

        <ModalFooter>
          {creating && (
            <MentorshipCreator
              menteeId={mentee.id}
              refetch={refetch}
              onClose={() => setCreating(false)}
            />
          )}
          <Button
            variant="brand"
            onClick={() => setCreating(true)}
            leftIcon={<AddIcon />}
          >
            增加导师
          </Button>
          <Spacer />
          <Button onClick={onClose}>关闭</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function MentorshipCreator({
  menteeId,
  refetch,
  onClose,
}: {
  menteeId: string;
  refetch: () => void;
  onClose: () => void;
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

  return (
    <ModalWithBackdrop isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>增加导师</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <UserSelector
              onSelect={(userIds) => userIds.length && save(userIds[0])}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>取消</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
