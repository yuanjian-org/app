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
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { toPinyin } from 'shared/strings';
import { trpcNext } from "trpc";
import { sectionSpacing } from 'theme/metrics';
import { isPermitted, RoleProfiles } from 'shared/Role';
import { defaultMentorCapacity } from './[mentorId]';
import NextLink from 'next/link';
import User, { MentorPreference } from 'shared/User';
import { ChevronRightIcon } from '@chakra-ui/icons';

/**
 * TODO: this file closely resembles interviewers.tsx. Dedupe?
 */
export default function Page() {
  const { data: stats } = 
    trpcNext.mentorships.listMentorStats.useQuery();

  return !stats ? <Loader /> : <TableContainer>
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>导师</Th>
          <Th>角色</Th>
          <Th>学生容量</Th>
          <Th>学生数量</Th>
          <Th>剩余容量</Th>
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
          preference={s.mentorPreference}
          mentorships={s.mentorships} 
        />)}
      </Tbody>
    </Table>

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{stats.length}</b> 名
    </Text>
  </TableContainer>;
}

function Row({ user, preference, mentorships }: {
  user: User,
  preference: MentorPreference | null,
  mentorships: number,
}) {
  const role = isPermitted(user.roles, 'MentorCoach') ? 'MentorCoach' :
    'Mentor';
  const roleColorScheme = role == 'MentorCoach' ? "yellow" : "teal";

  const capacity = preference?.最多匹配学生 ||
    defaultMentorCapacity;
  const isDefaultCapacity = preference?.最多匹配学生 === undefined;

  return <Tr key={user.id} _hover={{ bg: "white" }}> 
    <Td>
      <Link as={NextLink} href={`/mentors/manage/${user.id}`}>
        <b>{user.name}</b> <ChevronRightIcon />
      </Link>
    </Td>
    <Td>
      <Tag colorScheme={roleColorScheme}>
        {RoleProfiles[role].displayName}
      </Tag>
    </Td>
    <Td>{isDefaultCapacity ? `${defaultMentorCapacity}（默认）` : 
      capacity}</Td>
    <Td>{mentorships}</Td>
    <Td>{capacity - mentorships}</Td>
    <Td>{user.sex}</Td>
    <Td>{user.city}</Td>
    <Td>{user.email}</Td>
    <Td>{user.wechat}</Td>
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}
