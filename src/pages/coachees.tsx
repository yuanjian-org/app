import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Flex,
  TableContainer,
  Link,
  Box,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import Loader from 'components/Loader';
import { sectionSpacing } from 'theme/metrics';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { MenteeCells, MentorshipCells, LatestMentorMeetingDateCell } from './mentees';

export default function Page() {
  const { data: mentorships } = trpcNext.mentorships.listMyMentorshipsAsCoach.useQuery();

  return <Flex direction='column' gap={sectionSpacing}>
    <Box>
      <Link target='_blank'
        href="https://www.notion.so/yuanjian/e140913982174da3ae8f8d37976dcd7e"
      >资深导师职责 <ExternalLinkIcon /></Link>
    </Box>

    {!mentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>录取届</Th><Th>来源</Th><Th>学生</Th><Th>导师</Th><Th>最近师生通话</Th>
          <Th>最近导师交流</Th>
        </Tr>
      </Thead>
      <Tbody>
        {mentorships.map(m => <Tr key={m.id} _hover={{ bg: "white" }}>
          <MenteeCells mentee={m.mentee} />
          <MentorshipCells mentee={m.mentee} readonly />
          <LatestMentorMeetingDateCell menteeId={m.mentee.id} />
        </Tr>
      )}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};

Page.title = "资深导师页";
