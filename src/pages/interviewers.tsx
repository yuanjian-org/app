import {
  Table,
  Th,
  Tr,
  Td,
  TableContainer,
  Thead,
  Tbody,
  Text,
  Link,
  Flex,
  Switch,
} from "@chakra-ui/react";
import Loader from "components/Loader";
import { formatUserName, toPinyin } from "shared/strings";
import trpc, { trpcNext } from "trpc";
import { sectionSpacing } from "theme/metrics";
import { displayName } from "shared/Role";
import User, { getUserUrl } from "shared/User";
import { InterviewerPreference } from "shared/UserPreference";
import { UserProfile } from "shared/UserProfile";
import NextLink from "next/link";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { widePage } from "AppPage";
import moment from "moment";
import TruncatedTextWithTooltip from "components/TruncatedTextWithTooltip";
import ExamPassDateText from "components/ExamPassDateText";
import { optInInterviewerText } from "./preferences/[userId]";
import { RoleTag } from "./mentors/manage";

/**
 * TODO: this file closely resembles manage/mentors/index.tsx. Dedupe?
 */
export default widePage(() => {
  const { data: stats, refetch } =
    trpcNext.interviews.listInterviewerStats.useQuery();

  return !stats ? (
    <Loader />
  ) : (
    <Flex direction="column" gap={sectionSpacing}>
      <Text>
        以下列表包括所有{displayName("Mentor")}
        和在偏好设置中勾选了“{optInInterviewerText}”的
        {displayName("Volunteer")}。
      </Text>
      <TableContainer>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>避免</Th>
              <Th>面试官</Th>
              <Th>角色</Th>
              <Th>面试总量</Th>
              <Th>面试限制</Th>
              <Th>性别</Th>
              <Th>坐标</Th>
              <Th>通讯原则评测</Th>
              <Th>面试标准评测</Th>
              <Th>微信</Th>
              <Th>拼音（便于查找）</Th>
            </Tr>
          </Thead>

          <Tbody>
            {stats
              .sort((a, b) => {
                const diff = a.interviews - b.interviews;
                if (diff !== 0) return diff;
                // Compare ID to semi-randomize the order.
                return a.user.id.localeCompare(b.user.id);
              })
              .map((s) => (
                <Row
                  key={s.user.id}
                  user={s.user}
                  interviews={s.interviews}
                  preference={s.preference}
                  profile={s.profile}
                  avoid={s.avoid}
                  refetch={refetch}
                />
              ))}
          </Tbody>
        </Table>

        <Text fontSize="sm" color="gray" marginTop={sectionSpacing}>
          共 <b>{stats.length}</b> 名
        </Text>
      </TableContainer>
    </Flex>
  );
}, "面试官");

function Row({
  user,
  interviews,
  preference,
  profile,
  avoid,
  refetch,
}: {
  user: User;
  interviews: number;
  preference: InterviewerPreference;
  profile: UserProfile;
  avoid: boolean;
  refetch: () => void;
}) {
  const { data: state } = trpcNext.users.getUserState.useQuery({
    userId: user.id,
  });

  const limit = preference.limit;

  const saveAvoid = async (avoid: boolean) => {
    await trpc.interviews.avoidAsInterviewer.mutate({ userId: user.id, avoid });
    refetch();
  };

  return (
    <Tr _hover={{ bg: "white" }}>
      {/* 避免 */}
      <Td>
        <Switch
          isChecked={avoid}
          onChange={(e) => saveAvoid(e.target.checked)}
        />
      </Td>
      {/* 面试官 */}
      <Td>
        <Link as={NextLink} href={getUserUrl(user)}>
          <Text
            style={
              avoid
                ? { textDecoration: "line-through", color: "gray" }
                : { fontWeight: "bold" }
            }
          >
            {formatUserName(user.name)} <ChevronRightIcon />
          </Text>
        </Link>
      </Td>

      {/* 角色 */}
      <Td>
        <RoleTag roles={user.roles} />
      </Td>

      {/* 面试总量 */}
      <Td>{interviews}</Td>

      {/* 面试限制 */}
      <Td>
        {limit && (
          <Text as={moment().isAfter(moment(limit.until)) ? "s" : undefined}>
            {/* slice() to trim a full date-time string to just the date string */}
            {`${limit.noMoreThan} 直到 ${limit.until.slice(0, 10)}`}
          </Text>
        )}
      </Td>

      {/* 性别 */}
      <Td>{profile.性别}</Td>

      {/* 坐标 */}
      <Td>
        <TruncatedTextWithTooltip text={profile.现居住地} />
      </Td>

      {/* 通讯原则评测 */}
      <Td>{state && <ExamPassDateText lastPassed={state.commsExam} />}</Td>

      {/* 面试标准评测 */}
      <Td>
        {state && <ExamPassDateText lastPassed={state.menteeInterviewerExam} />}
      </Td>

      {/* 微信 */}
      <Td>{user.wechat}</Td>

      {/* 拼音 */}
      <Td>{toPinyin(user.name ?? "")}</Td>
    </Tr>
  );
}
