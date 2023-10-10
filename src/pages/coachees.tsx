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
import { MentorshipTableRow } from '../components/MentorshipTableRow';
import { sectionSpacing } from 'theme/metrics';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export default function Page() {
  const [user] = useUserContext();

  const { data: mentorships } = trpcNext.mentorships.listMineAsCoach.useQuery();

  return <Flex direction='column' gap={sectionSpacing}>
    <Box>
      <Link target='_blank' href="https://www.notion.so/yuanjian/e140913982174da3ae8f8d37976dcd7e">
        资深导师职责 <ExternalLinkIcon />
      </Link>
    </Box>

    {!mentorships ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>学生</Th><Th>导师</Th><Th>最近师生通话</Th><Th>最近内部讨论</Th>
        </Tr>
      </Thead>
      <Tbody>
      {mentorships.map(m => <MentorshipTableRow key={m.id} mentorship={m} />)}
      </Tbody>
    </Table></TableContainer>}

  </Flex>;
};
