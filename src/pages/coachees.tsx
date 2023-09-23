import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  TableContainer,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import Loader from 'components/Loader';
import { Partnership } from 'shared/Partnership';
import { useUserContext } from 'UserContext';
import { formatUserName } from 'shared/strings';
import TrLink from 'components/TrLink';

export default function Page() {
  const [user] = useUserContext();

  const { data: coacheeMentorships } = trpcNext.users.listMyCoachees.useQuery();

  return <Flex direction='column' gap={6}>
    {!coacheeMentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th>
        </Tr>
      </Thead>
      <Tbody>
      {coacheeMentorships.map(m => <MentorshipRow key={m.id} mentorship={m}  />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

function MentorshipRow({ mentorship: m }: {
  mentorship: Partnership,
}) {
  return <TrLink href={`/partnerships/${m.id}`}>
    <Td>{formatUserName(m.mentee.name, "formal")}</Td>
    <Td>{formatUserName(m.mentor.name, "formal")}</Td>
  </TrLink>;
}
