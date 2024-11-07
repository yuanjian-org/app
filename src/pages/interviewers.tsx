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
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { toPinyin } from 'shared/strings';
import { trpcNext } from "trpc";
import { sectionSpacing } from 'theme/metrics';
import { isPermitted, RoleProfiles } from 'shared/Role';
import User, { UserPreference } from 'shared/User';

/**
 * TODO: this file closely resembles manage/mentors/index.tsx. Dedupe?
 */
export default function Page() {
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
        />)}
      </Tbody>
    </Table>

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{stats.length}</b> 名
    </Text>
  </TableContainer>;
}

function Row({ user, interviews, preference }: {
  user: User,
  interviews: number,
  preference: UserPreference | null,
}) {
  const role = isPermitted(user.roles, 'MentorCoach')
    ? 'MentorCoach' : isPermitted(user.roles, 'Mentor')
    ? 'Mentor' : null;
  const roleColorScheme = role == 'MentorCoach' ? "yellow" : "teal";
  const limit = preference?.interviewer?.limit;

  return <Tr key={user.id} _hover={{ bg: "white" }}> 
    <Td>{user.name}</Td>
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
    <Td>{user.sex}</Td>
    <Td>{user.city}</Td>
    <Td>{user.email}</Td>
    <Td>{user.wechat}</Td>
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}
