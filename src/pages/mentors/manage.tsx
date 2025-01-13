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
  Spacer,
  ModalContent,
  Button,
  FormControl,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName, toPinyin } from 'shared/strings';
import trpc, { trpcNext } from "trpc";
import { componentSpacing } from 'theme/metrics';
import Role, { isPermitted, RoleProfiles } from 'shared/Role';
import NextLink from 'next/link';
import User, {
  defaultMentorCapacity, getUserUrl, MentorPreference,
  MinUser
} from 'shared/User';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { UserProfile } from 'shared/UserProfile';
import { widePage } from 'AppPage';
import { MdEdit } from 'react-icons/md';
import { useState } from 'react';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import UserSelector from 'components/UserSelector';
import TruncatedTextWithTooltip from 'components/TruncatedTextWithTooltip';
import { ExamPassDateText } from 'exams';

/**
 * TODO: this file closely resembles interviewers.tsx. Dedupe?
 */
export default widePage(() => {
  const { data: stats } = 
    trpcNext.mentorships.listMentorStats.useQuery();

  return !stats ? <Loader /> : <TableContainer>
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>导师</Th>
          <Th>角色</Th>
          <Th>资深导师</Th>
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
}, "导师");

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
  return <Td><Text fontSize="sm" color="gray" marginTop={componentSpacing}>
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
  const { data: state } = trpcNext.users.getUserState.useQuery({
    userId: user.id,
  });
  const { data: coach, refetch } = trpcNext.users.getMentorCoach.useQuery({
    userId: user.id,
  });
  const [editingCoach, setEditingCoach] = useState<boolean>(false);

  const role: Role = isPermitted(user.roles, 'MentorCoach') ? 'MentorCoach' :
    isPermitted(user.roles, 'TransactionalMentor') ? 'TransactionalMentor' :
    'Mentor';
  const roleColorScheme = role == 'MentorCoach' ? "yellow" :
    isPermitted(user.roles, 'TransactionalMentor') ? "red" : "teal";

  const capacity = cap(preference);
  const isDefaultCapacity = preference.最多匹配学生 === undefined;

  return <Tr key={user.id} _hover={{ bg: "white" }}> 
    {/* 导师 */}
    <Td>
      <Link as={NextLink} href={getUserUrl(user)}>
        <b>{formatUserName(user.name, "formal")}</b> <ChevronRightIcon />
      </Link>
    </Td>

    {/* 角色 */}
    <Td>
      <Tag colorScheme={roleColorScheme}>
        {RoleProfiles[role].displayName}
      </Tag>
    </Td>

    {/* 资深导师 */}
    <Td>
      <Link onClick={() => setEditingCoach(true)}>
        {coach ? formatUserName(coach.name) : <MdEdit />}
      </Link>
    </Td>

    {coach !== undefined && editingCoach && <CoachEditor
      mentor={user}
      coach={coach}
      refetch={refetch}
      onClose={() => setEditingCoach(false)}
    />}

    {/* 学生容量 */}
    <Td>{capacity}{isDefaultCapacity && `（默认）`}</Td>

    {/* 学生数量 */}
    <Td>{mentorships}</Td>

    {/* 剩余容量 */}
    <Td>{capacity - mentorships}</Td>

    {/* 通讯原则评测 */}
    <Td>
      {state && <ExamPassDateText lastPassed={state.commsExam} />}
    </Td>

    {/* 导师手册评测 */}
    <Td>
      {state && <ExamPassDateText lastPassed={state.handbookExam} />}
    </Td>

    {/* 已设偏好 */}
    <Td>
      {preference.学生特质 ?
        <Tag colorScheme="green">是</Tag> : <Tag colorScheme="red">否</Tag>}
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
  </Tr>;
}

function CoachEditor({ mentor, coach, refetch, onClose }: {
  mentor: MinUser,
  coach: MinUser | null,
  refetch: () => void,
  onClose: () => void,
}) {
  const saveCoach = async (coachId: string | null) => {
    await trpc.users.setMentorCoach.mutate({
      userId: mentor.id,
      coachId,
    });
    onClose();
    refetch();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>{formatUserName(mentor.name)}的资深导师</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <FormControl>
          <UserSelector
            initialValue={coach ? [coach] : []}
            onSelect={userIds => saveCoach(userIds.length ? userIds[0] : null)}
          />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Spacer />
        <Button onClick={onClose}>取消</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
