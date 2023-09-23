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
import { PartnershipWithGroupAndNotes } from 'shared/Partnership';
import { useUserContext } from 'UserContext';
import { formatUserName, prettifyDate } from 'shared/strings';
import TrLink from 'components/TrLink';
import moment from 'moment';

export default function Page() {
  const [user] = useUserContext();

  const { data: coacheeMentorships } = trpcNext.users.listMyCoachees.useQuery();

  return <Flex direction='column' gap={6}>
    {!coacheeMentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>最近通话</Th>
        </Tr>
      </Thead>
      <Tbody>
      {coacheeMentorships.map(m => <MentorshipRow key={m.id} mentorship={m}  />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

function MentorshipRow({ mentorship: m }: {
  mentorship: PartnershipWithGroupAndNotes,
}) {
  let msg;
  let daysAgo;
  if (m.group.transcripts.length) {
    // return the most recent transcript
    const t = m.group.transcripts.reduce((a, b) => moment(a.startedAt).isBefore(b.startedAt) ? b : a);
    msg = prettifyDate(t.startedAt);
    daysAgo = moment().diff(t.startedAt, "days");
  } else {
    msg = "尚未通话";
    daysAgo = moment().dayOfYear();
  }
  const color = daysAgo < 45 ? "green" : daysAgo < 60 ? "yellow.600" : "brown";

  return <TrLink href={`/partnerships/${m.id}`}>
    <Td>{formatUserName(m.mentee.name, "formal")}</Td>
    <Td>{formatUserName(m.mentor.name, "formal")}</Td>
    <Td color={color}>{msg}</Td>
  </TrLink>;
}
