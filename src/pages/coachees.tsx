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
import { useUserContext } from 'UserContext';
import { sectionSpacing } from 'theme/metrics';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { MenteeCell, MentorshipCells, MostRecentChatMessageCell } from './mentees';

export default function Page() {
  const [user] = useUserContext();

  const { data: mentorships } = trpcNext.mentorships.listMineAsCoach.useQuery();

  return <Flex direction='column' gap={sectionSpacing}>
    <Box>
      <Link target='_blank'
        href="https://www.notion.so/yuanjian/e140913982174da3ae8f8d37976dcd7e"
      >资深导师职责 <ExternalLinkIcon /></Link>
    </Box>

    {!mentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>最近师生通话</Th><Th>最近内部笔记</Th>
        </Tr>
      </Thead>
      <Tbody>
        {mentorships.map(m => <Tr key={m.id} _hover={{ bg: "white" }}>
          <MenteeCell mentee={m.mentee} />
          <MentorshipCells menteeId={m.mentee.id} readonly />
          <MostRecentChatMessageCell menteeId={m.mentee.id} />
        </Tr>
      )}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};
