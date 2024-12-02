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
import { isPermitted, RoleProfiles } from 'shared/Role';
import User, { getUserUrl, InterviewerPreference } from 'shared/User';
import { UserProfile } from 'shared/UserProfile';
import NextLink from 'next/link';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { widePage } from 'AppPage';

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
          <Th>总面试量</Th>
          <Th>面试限制</Th>
          <Th>性别</Th>
          <Th>坐标</Th>
          <Th>邮箱</Th>
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

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
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
  const role = isPermitted(user.roles, 'MentorCoach')
    ? 'MentorCoach' : isPermitted(user.roles, 'Mentor')
    ? 'Mentor' : null;
  const roleColorScheme = role == 'MentorCoach' ? "yellow" : "teal";
  const limit = preference.limit;

  return <Tr key={user.id} _hover={{ bg: "white" }}> 
    <Td>
      <Link as={NextLink} href={getUserUrl(user)}>
        <b>{formatUserName(user.name, "formal")}</b> <ChevronRightIcon />
      </Link>
    </Td>
    <Td>
      {role && <Tag colorScheme={roleColorScheme}>
        {RoleProfiles[role].displayName}
      </Tag>}
    </Td>
    <Td>{interviews}</Td>
    <Td>
      {/* slice() to trim a full date-time string to just the date string */}
      {limit && `${limit.noMoreThan} 直到 ${limit.until.slice(0, 10)}`}
    </Td>
    <Td>{profile.性别}</Td>
    <Td>{profile.现居住地}</Td>
    <Td>{user.email}</Td>
    <Td>{user.wechat}</Td>
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}
