import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  WrapItem,
  Wrap,
  LinkOverlay,
  LinkBox,
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import { formatUserName } from 'shared/strings';
import { Interview } from 'shared/Interview';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import { useUserContext } from 'UserContext';
import NextLink from "next/link";

const Page: NextPageWithLayout = () => {
  const { data: interviews } = trpcNext.interviews.listMine.useQuery<Interview[] | undefined>();
  const [me] = useUserContext();
  
  return !interviews ? <Loader /> : <TableContainer><Table>
    <Thead>
      <Tr>
        <Th>类型</Th><Th>姓名</Th><Th>其他面试官</Th><Th>开始面试</Th>
      </Tr>
    </Thead>
    <Tbody>
    {interviews.map(i => (
      <LinkBox as={Tr} key={i.id}>
        <Td>
          {i.type === "MenteeInterview" ? "候选学生" : "候选导师"}
        </Td>
        <Td>
          <LinkOverlay as={NextLink} href={`/interviews/mine/${i.id}`}>
            {formatUserName(i.interviewee.name, "formal")}
          </LinkOverlay>
        </Td>
        <Td><Wrap spacing="2">
          {i.feedbacks.filter(f => f.interviewer.id !== me.id).map(f => 
            <WrapItem key={f.id} fontWeight={f.feedbackCreatedAt ? "bold" : "normal"}>
              {formatUserName(f.interviewer.name, "formal")}
            </WrapItem>
          )}
        </Wrap></Td>
        <Td>
          <ArrowForwardIcon />
        </Td>
      </LinkBox>
    ))}
    </Tbody>
  </Table></TableContainer>;
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
