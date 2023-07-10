import {
  Button,
  Table,
  Tbody,
  Tr,
  Td,
  Flex,
  Box,
  LinkBox,
  LinkOverlay,
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../../NextPageWithLayout'
import { trpcNext } from "../../../trpc";
import trpc from 'trpc';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import { PartnershipWithAssessments } from 'shared/Partnership';
import { useRouter } from 'next/router';
import { parseQueryParameter } from '../../../parseQueryParamter';
import { prettifyDate } from 'shared/strings';
import { UserChips } from 'components/GroupBar';
import PageBreadcrumb from 'components/PageBreadcrumb';
import NextLink from "next/link";

const Page: NextPageWithLayout = () => {;
  const partnershipId = parseQueryParameter(useRouter(), "partnershipId");
  const { data: partnership, refetch } = trpcNext.partnerships.getWithAssessments.useQuery
    <PartnershipWithAssessments | undefined>({ id: partnershipId });

  const add = async () => {
    await trpc.assessments.create.mutate({ partnershipId });
    refetch();
  };

  if (!partnership) return <Loader />

  return <>
    <PageBreadcrumb current="评估列表" parents={[
      { name: "一对一导师管理", link: "/partnerships" }
    ]}/>

    {!partnership ? <Loader /> : <Flex direction='column' gap={6}>
      <UserChips users={[partnership.mentee, partnership.mentor]} abbreviateOnMobile={false} />

      <Box>
        <Button variant='brand' leftIcon={<AddIcon />} onClick={add}>创建评估</Button>
      </Box>
      <Table>
        <Tbody>
        {partnership.assessments.map(a => (
          <LinkBox key={a.id}>
            <Tr>
              <Td>
                {prettifyDate(a.createdAt)}
              </Td>
              <Td>
                {a.summary || "无数据"}
              </Td>
              <Td>
                <LinkOverlay as={NextLink} href={`/partnerships/${partnershipId}/assessments/${a.id}`}>
                  <EditIcon />
                </LinkOverlay>
              </Td>
            </Tr>
          </LinkBox>
        ))}
        </Tbody>
      </Table>
    </Flex>}
  </>;
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
