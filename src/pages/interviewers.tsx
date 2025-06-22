import {
  Table,
  Th,
  Tr,
  Td,
  TableContainer,
  Thead,
  Tbody,
  Text,
  Tag,
  Link,
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName, toPinyin } from 'shared/strings';
import { trpcNext } from "trpc";
import { sectionSpacing } from 'theme/metrics';
import Role, { isPermitted, RoleProfiles } from 'shared/Role';
import User, { getUserUrl, InterviewerPreference } from 'shared/User';
import { UserProfile } from 'shared/UserProfile';
import NextLink from 'next/link';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { widePage } from 'AppPage';
import moment from 'moment';
import TruncatedTextWithTooltip from 'components/TruncatedTextWithTooltip';
import ExamPassDateText from 'components/ExamPassDateText';

/**
 * TODO: this file closely resembles manage/mentors/index.tsx. Dedupe?
 */
export default widePage(() => {
  const { data: stats } = 
    trpcNext.interviews.listInterviewerStats.useQuery();

  return !stats ? <Loader /> : <TableContainer>
    <Table size="sm">
      <Thead>
        <Tr>
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
        {stats.map(s => <Row
          key={s.user.id}
          user={s.user}
          interviews={s.interviews}
          preference={s.preference}
          profile={s.profile}
        />)}
      </Tbody>
    </Table>

    <Text fontSize="sm" color="gray" marginTop={sectionSpacing}>
      共 <b>{stats.length}</b> 名
    </Text>
  </TableContainer>;
}, "面试官");

function Row({ user, interviews, preference, profile }: {
  user: User,
  interviews: number,
  preference: InterviewerPreference,
  profile: UserProfile,
}) {
  const { data: state } = trpcNext.users.getUserState.useQuery({
    userId: user.id,
  });

  const role: Role | null = isPermitted(user.roles, 'Mentor') ? 'Mentor' : null;
  const limit = preference.limit;

  return <Tr _hover={{ bg: "white" }}> 
    {/* 面试官 */}
    <Td>
      <Link as={NextLink} href={getUserUrl(user)}>
        <b>{formatUserName(user.name)}</b> <ChevronRightIcon />
      </Link>
    </Td>

    {/* 角色 */}
    <Td>
      {role && <Tag colorScheme="teal">
        {RoleProfiles[role].displayName}
      </Tag>}
    </Td>

    {/* 面试总量 */}
    <Td>{interviews}</Td>

    {/* 面试限制 */}
    <Td>
      {limit && <Text
        as={moment().isAfter(moment(limit.until)) ? "s" : undefined}
      >
        {/* slice() to trim a full date-time string to just the date string */}
        {`${limit.noMoreThan} 直到 ${limit.until.slice(0, 10)}`}
      </Text>}
    </Td>

    {/* 性别 */}
    <Td>{profile.性别}</Td>

    {/* 坐标 */}
    <Td>
      <TruncatedTextWithTooltip text={profile.现居住地} />
    </Td>

    {/* 通讯原则评测 */}
    <Td>
      {state && <ExamPassDateText lastPassed={state.commsExam} />}
    </Td>

    {/* 面试标准评测 */}
    <Td>
      {state && <ExamPassDateText lastPassed={state.menteeInterviewerExam} />}
    </Td>

    {/* 微信 */}
    <Td>{user.wechat}</Td>

    {/* 拼音 */}
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}
