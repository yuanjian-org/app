import {
  Flex,
  Divider,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../../trpc";
import Loader from 'components/Loader';
import { PartnershipWithAssessments } from 'shared/Partnership';
import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from '../../../parseQueryString';
import { UserChips } from 'components/GroupBar';
import PageBreadcrumb from 'components/PageBreadcrumb';
import AssessmentsPanel from 'components/AssessmentsPanel';

export default function Page() {
  const partnershipId = parseQueryStringOrUnknown(useRouter(), "partnershipId");
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
        // @ts-expect-error so weird
        assessments={partnership?.assessments} />
    </Flex>
  </>;
};
