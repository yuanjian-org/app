import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Flex,
  TableContainer,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import Loader from 'components/Loader';
import { useUserContext } from 'UserContext';
import { MentorshipTableRow } from '../components/MentorshipTableRow';

export default function Page() {
  const [user] = useUserContext();

  const { data: mentorships } = trpcNext.partnerships.listMineAsCoach.useQuery();

  return <Flex direction='column' gap={6}>
    {!mentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>最近通话</Th>
        </Tr>
      </Thead>
      <Tbody>
      {mentorships.map(m => <MentorshipTableRow key={m.id} mentorship={m} />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};
