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
import { componentSpacing } from 'theme/metrics';
import { isPermitted, RoleProfiles } from 'shared/Role';
import NextLink from 'next/link';
import User, { defaultMentorCapacity, MentorPreference } from 'shared/User';
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
        <SumsRow stats={stats} />
      </Tbody>
    </Table>
  </TableContainer>;
}

function SumsRow({ stats } : {
  stats: {
    mentorPreference: MentorPreference | null,
    mentorships: number,
  }[]
}) {
  const totalCap = stats.reduce((acc, cur) => acc + cap(cur.mentorPreference), 0);
  const totalMentorships = stats.reduce((acc, cur) => acc + cur.mentorships, 0);
  return <Tr>
    {/* 导师 */}
    <Td>
      <SumCell n={stats.length} />
    </Td>
    <Td></Td>
    {/* 学生容量 */}
    <Td>
      <SumCell n={totalCap} />
    </Td>
    {/* 学生数量 */}
    <Td>
      <SumCell n={totalMentorships} />
    </Td>
    {/* 剩余容量 */}
    <Td>
      <SumCell n={totalCap - totalMentorships} />
    </Td>    
  </Tr>;
}

function SumCell({ n }: { n: number }) {
  return <Text fontSize="sm" color="grey" marginTop={componentSpacing}>
    <b>共 {n}</b>
  </Text>;
}

function cap(pref: MentorPreference | null): number {
  return pref?.最多匹配学生 ?? defaultMentorCapacity;
}

function Row({ user, preference, mentorships }: {
  user: User,
  preference: MentorPreference | null,
  mentorships: number,
}) {
  const role = isPermitted(user.roles, 'MentorCoach') ? 'MentorCoach' :
    'Mentor';
  const roleColorScheme = role == 'MentorCoach' ? "yellow" : "teal";

  const capacity = cap(preference);
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
    <Td>{capacity}{isDefaultCapacity && `（默认）`}</Td>
    <Td>{mentorships}</Td>
    <Td>{capacity - mentorships}</Td>
    <Td>{user.sex}</Td>
    <Td>{user.city}</Td>
    <Td>{user.email}</Td>
    <Td>{user.wechat}</Td>
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}

Page.title = "管理导师";
