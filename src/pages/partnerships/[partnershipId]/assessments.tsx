import {
  Flex,
  Divider,
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from '../../../AppLayout'
import { NextPageWithLayout } from '../../../NextPageWithLayout'
import { trpcNext } from "../../../trpc";
import Loader from '../../../components/Loader';
import { PartnershipWithAssessments } from '../../../shared/Partnership';
import { useRouter } from 'next/router';
import { parseQueryParameter } from '../../../parseQueryParamter';
import { UserChips } from '../../../components/GroupBar';
import PageBreadcrumb from '../../../components/PageBreadcrumb';
import AssessmentsPanel from '../../../components/AssessmentsPanel';

const Page: NextPageWithLayout = () => {
  const partnershipId = parseQueryParameter(useRouter(), "partnershipId");
  const { data: partnership } = trpcNext.partnerships.getWithAssessmentsDeprecated
    .useQuery<PartnershipWithAssessments | undefined>(partnershipId);

  return !partnership ? <Loader /> : <>
    <PageBreadcrumb current="评估列表" parents={[
      { name: "一对一导师管理", link: "/partnerships" }
    ]}/>
    <Flex direction='column' gap={6}>
      <UserChips users={[partnership.mentee, partnership.mentor]} abbreviateOnMobile={false} />
      <Divider />
      <AssessmentsPanel allowEdit partnershipId={partnership.id} 
        // @ts-ignore so weird
        assessments={partnership?.assessments} />
    </Flex>
  </>;
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
