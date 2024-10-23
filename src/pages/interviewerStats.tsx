import {
  Table,
  Th,
  Tr,
  Td,
  TableContainer,
  Thead,
  Tbody,
  Text,
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { toPinyin } from 'shared/strings';
import { trpcNext } from "trpc";
import { sectionSpacing } from 'theme/metrics';

export default function Page() {
  const { data: interviewStats } = 
    trpcNext.interviews.getInterviewerStats.useQuery();

  return !interviewStats ? <Loader /> : <TableContainer>
    <Table>
      <Thead>
        <Tr>
          <Th>面试官</Th>
          <Th>面试数量</Th>
          <Th>性别</Th>
          <Th>邮箱</Th>
          <Th>微信</Th>     
          <Th>拼音（便于查找）</Th>
        </Tr>
      </Thead>

      <Tbody>
        {interviewStats.map(interviewStat => {
          const { user } = interviewStat;
          return (
            <Tr key={user.id} _hover={{ bg: "white" }}> 
              <Td>{user.name}</Td>
              <Td>{interviewStat.interviews}</Td>
              <Td>{user.sex}</Td>
              <Td>{user.email}</Td>
              <Td>{user.wechat}</Td>
              <Td>{toPinyin(user.name ?? "")}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{interviewStats.length}</b> 名
    </Text>
  </TableContainer>;
}
