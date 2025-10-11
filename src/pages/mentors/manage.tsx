import {
  Link,
  Table,
  Th,
  Tr,
  Td,
  TableContainer,
  Thead,
  Tbody,
  Text,
  Tag,
  Checkbox,
  Box,
  Wrap,
  WrapItem,
  Heading,
  Tooltip,
} from "@chakra-ui/react";
import Loader from "components/Loader";
import { formatUserName, toPinyin } from "shared/strings";
import { trpcNext } from "trpc";
import { componentSpacing, pageMarginX } from "theme/metrics";
import Role, { displayName, isPermitted } from "shared/Role";
import NextLink from "next/link";
import User, { getUserUrl } from "shared/User";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { UserProfile } from "shared/UserProfile";
import { fullPage } from "AppPage";
import { useState } from "react";
import TruncatedTextWithTooltip from "components/TruncatedTextWithTooltip";
import ExamPassDateText from "components/ExamPassDateText";
import TopBar, { topBarPaddings } from "components/TopBar";
import { okTextColor, warningTextColor } from "theme/colors";
import { defaultMentorCapacity, MentorPreference } from "shared/UserPreference";

const title = "导师档案";

/**
 * TODO: this file closely resembles interviewers.tsx. Dedupe?
 */
export default fullPage(() => {
  const [showOnlyWithCapacity, setShowOnlyWithCapacity] = useState(false);
  const [showMatchState, setShowMatchState] = useState(false);

  return (
    <>
      <TopBar {...topBarPaddings()}>
        <Wrap spacing={componentSpacing}>
          <WrapItem>
            <Heading size="md">{title}</Heading>
          </WrapItem>
          <WrapItem>
            <Checkbox
              isChecked={showOnlyWithCapacity}
              onChange={(e) => setShowOnlyWithCapacity(e.target.checked)}
            >
              仅显示有剩余容量的一对一导师
            </Checkbox>
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
        <Mentors
          showOnlyWithCapacity={showOnlyWithCapacity}
          showMatchState={showMatchState}
        />
      </Box>
    </>
  );
}, title);

function Mentors({
  showOnlyWithCapacity,
  showMatchState,
}: {
  showOnlyWithCapacity: boolean;
  showMatchState: boolean;
}) {
  const { data: stats } = trpcNext.users.listMentorStats.useQuery();

  return !stats ? (
    <Loader />
  ) : (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>导师</Th>
            <Th>角色</Th>
            {showMatchState && <Th color="brand.c">交流反馈状态</Th>}
            <Th>学生容量</Th>
            <Th>学生数量</Th>
            <Th>剩余容量</Th>
            <Th>通讯原则评测</Th>
            <Th>导师手册评测</Th>
            <Th>已设偏好</Th>
            <Th>文字偏好</Th>
            <Th>性别</Th>
            <Th>坐标</Th>
            <Th>微信</Th>
            <Th>拼音（便于查找）</Th>
          </Tr>
        </Thead>

        <Tbody>
          {stats
            .filter(
              (s) =>
                !showOnlyWithCapacity ||
                (cap(s.preference) - s.mentorships > 0 &&
                  !isPermitted(s.user.roles, "TransactionalMentor")),
            )
            .map((s) => (
              <MentorRow
                key={s.user.id}
                user={s.user}
                mentorships={s.mentorships}
                preference={s.preference}
                profile={s.profile}
                showMatchState={showMatchState}
              />
            ))}
          <SumsRow stats={stats} />
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function SumsRow({
  stats,
}: {
  stats: {
    preference: MentorPreference;
    mentorships: number;
  }[];
}) {
  const totalCap = stats.reduce((acc, cur) => acc + cap(cur.preference), 0);
  const totalMentorships = stats.reduce((acc, cur) => acc + cur.mentorships, 0);
  return (
    <Tr>
      {/* 导师 */}
      <SumCell n={stats.length} />
      <Td></Td>
      <Td></Td>
      {/* 学生容量 */}
      <SumCell n={totalCap} />
      {/* 学生数量 */}
      <SumCell n={totalMentorships} />
      {/* 剩余容量 */}
      <SumCell n={totalCap - totalMentorships} />
    </Tr>
  );
}

function SumCell({ n }: { n: number }) {
  return (
    <Td>
      <Text fontSize="sm" color="gray" marginTop={componentSpacing}>
        <b>共 {n}</b>
      </Text>
    </Td>
  );
}

function cap(pref: MentorPreference): number {
  return pref.最多匹配学生 ?? defaultMentorCapacity;
}

export function RoleTag({ roles }: { roles: Role[] }) {
  const { r, c }: { r: Role | null; c: string } = isPermitted(
    roles,
    "TransactionalMentor",
  )
    ? { r: "TransactionalMentor", c: "red" }
    : isPermitted(roles, "Mentor")
      ? { r: "Mentor", c: "teal" }
      : isPermitted(roles, "Volunteer")
        ? { r: "Volunteer", c: "orange" }
        : { r: null, c: "grey" };

  return r && <Tag colorScheme={c}>{displayName(r)}</Tag>;
}

function MentorRow({
  user,
  profile,
  preference,
  mentorships,
  showMatchState,
}: {
  user: User;
  mentorships: number;
  preference: MentorPreference;
  profile: UserProfile;
  showMatchState: boolean;
}) {
  const { data: state } = trpcNext.users.getUserState.useQuery({
    userId: user.id,
  });

  const capacity = cap(preference);
  const isDefaultCapacity = preference.最多匹配学生 === undefined;

  return (
    <Tr _hover={{ bg: "white" }}>
      {/* 导师 */}
      <Td>
        <Link as={NextLink} href={getUserUrl(user)}>
          <b>{formatUserName(user.name, "formal")}</b> <ChevronRightIcon />
        </Link>
      </Td>

      {/* 角色 */}
      <Td>
        <RoleTag roles={user.roles} />
      </Td>

      {/* 师生匹配状态 */}
      {showMatchState && <MentorMatchFeedbackStateCell mentorId={user.id} />}

      {/* 学生容量 */}
      <Td>
        {capacity}
        {isDefaultCapacity && `（默认）`}
      </Td>

      {/* 学生数量 */}
      <Td>{mentorships}</Td>

      {/* 剩余容量 */}
      <Td>{capacity - mentorships}</Td>

      {/* 通讯原则评测 */}
      <Td>{state && <ExamPassDateText lastPassed={state.commsExam} />}</Td>

      {/* 导师手册评测 */}
      <Td>{state && <ExamPassDateText lastPassed={state.handbookExam} />}</Td>

      {/* 已设偏好 */}
      <Td>
        {preference.学生特质 ? (
          <Tag colorScheme="green">是</Tag>
        ) : (
          <Tag colorScheme="red">否</Tag>
        )}
      </Td>

      {/* 文字偏好 */}
      <Td>
        <TruncatedTextWithTooltip text={preference.学生特质?.其他} />
      </Td>

      {/* 性别 */}
      <Td>{profile.性别}</Td>

      {/* 坐标 */}
      <Td>
        <TruncatedTextWithTooltip text={profile.现居住地} />
      </Td>

      {/* 微信 */}
      <Td>{user.wechat}</Td>

      {/* 拼音 */}
      <Td>{toPinyin(user.name ?? "")}</Td>
    </Tr>
  );
}

function MentorMatchFeedbackStateCell({ mentorId }: { mentorId: string }) {
  const { data } = trpcNext.matchFeedback.getLastMentorMatchFeedback.useQuery({
    mentorId,
  });

  const total = data?.mentees.length ?? 0;
  const [choices, reasons] = data?.mentees.reduce(
    ([choices, reasons], m) => {
      if (m.choice) choices += 1;
      if (m.reason) reasons += 1;
      return [choices, reasons];
    },
    [0, 0],
  ) ?? [0, 0];

  return (
    <MatchFeedbackStateCell
      loading={data === undefined}
      total={total}
      scores={choices}
      reasons={reasons}
    />
  );
}

export function MatchFeedbackStateCell({
  loading,
  total,
  scores,
  reasons,
}: {
  loading: boolean;
  total: number;
  scores: number;
  reasons: number;
}) {
  return (
    <Td>
      {loading ? (
        <Text />
      ) : total === 0 ? (
        <Text color="gray">无反馈表</Text>
      ) : (
        <Tooltip label="匹配数量 / 已评分数量 / 评分原因数量">
          <Text color={total == scores ? okTextColor : warningTextColor}>
            {total} / {scores} / {reasons}
          </Text>
        </Tooltip>
      )}
    </Td>
  );
}
