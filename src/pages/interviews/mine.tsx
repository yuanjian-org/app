import {
  Link,
  HStack,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../trpc";
import Interviews from 'components/Interviews';
import PageBreadcrumb from 'components/PageBreadcrumb';
import NextLink from 'next/link';
import { sectionSpacing } from 'theme/metrics';
import { IoChatbubblesOutline } from "react-icons/io5";

export default function Page () {
  const { data: interviews } = trpcNext.interviews.listMine.useQuery();
  const { data: calibrations } = trpcNext.calibrations.listMine.useQuery();

  return <>
    <PageBreadcrumb current='我的面试' />
    <Interviews interviews={interviews} forCalibration={false}
      hideTotalCount />

    {calibrations && calibrations.length > 0 && <>
      <PageBreadcrumb current='面试讨论组' mt={sectionSpacing * 2} />
      {calibrations.map(c => <Link
        key={c.id} 
        as={NextLink}
        href={`/calibrations/${c.id}`}
      >
        <HStack>
          <IoChatbubblesOutline />
          <Text>{c.name}</Text>
        </HStack>
      </Link>)}
    </>}
  </>;
}

Page.title = "我的面试";
