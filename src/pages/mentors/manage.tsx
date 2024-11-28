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
import { formatUserName, toPinyin } from 'shared/strings';
import { trpcNext } from "trpc";
import { componentSpacing } from 'theme/metrics';
import { isPermitted, RoleProfiles } from 'shared/Role';
import NextLink from 'next/link';
import User, { defaultMentorCapacity, getUserUrl, MentorPreference } from 'shared/User';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { UserProfile } from 'shared/UserProfile';

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
          mentorships={s.mentorships} 
          preference={s.preference}
          profile={s.profile}
        />)}
        <SumsRow stats={stats} />
      </Tbody>
    </Table>
  </TableContainer>;
}

function SumsRow({ stats } : {
  stats: {
    preference: MentorPreference,
    mentorships: number,
  }[]
}) {
  const totalCap = stats.reduce((acc, cur) => acc + cap(cur.preference), 0);
  const totalMentorships = stats.reduce((acc, cur) => acc + cur.mentorships, 0);
  return <Tr>
    {/* 导师 */}
    <SumCell n={stats.length} />
    <Td></Td>
    {/* 学生容量 */}
    <SumCell n={totalCap} />
    {/* 学生数量 */}
    <SumCell n={totalMentorships} />
    {/* 剩余容量 */}
    <SumCell n={totalCap - totalMentorships} />
  </Tr>;
}

function SumCell({ n }: { n: number }) {
  return <Td><Text fontSize="sm" color="grey" marginTop={componentSpacing}>
    <b>共 {n}</b>
  </Text></Td>;
}

function cap(pref: MentorPreference): number {
  return pref.最多匹配学生 ?? defaultMentorCapacity;
}

function Row({ user, profile, preference, mentorships }: {
  user: User,
  mentorships: number,
  preference: MentorPreference,
  profile: UserProfile,
}) {
  const role = isPermitted(user.roles, 'MentorCoach') ? 'MentorCoach' :
    'Mentor';
  const roleColorScheme = role == 'MentorCoach' ? "yellow" : "teal";

  const capacity = cap(preference);
  const isDefaultCapacity = preference.最多匹配学生 === undefined;

  return <Tr key={user.id} _hover={{ bg: "white" }}> 
    <Td>
      <Link as={NextLink} href={getUserUrl(user)}>
        <b>{formatUserName(user.name, "formal")}</b> <ChevronRightIcon />
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
    <Td>{profile.性别}</Td>
    <Td>{profile.现居住地}</Td>
    <Td>{user.email}</Td>
    <Td>{user.wechat}</Td>
    <Td>{toPinyin(user.name ?? "")}</Td>
  </Tr>;
}

Page.title = "导师";
