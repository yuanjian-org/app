import {
  Link,
  HStack,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../trpc";
import Interviews from 'components/Interviews';
import { widePage } from 'AppPage';
import PageBreadcrumb from 'components/PageBreadcrumb';
import NextLink from 'next/link';
import { sectionSpacing } from 'theme/metrics';
import { IoChatbubblesOutline } from "react-icons/io5";

export default widePage(() => {
  const { data: interviews } = trpcNext.interviews.listMine.useQuery();
  const { data: calibrations } = trpcNext.calibrations.listMine.useQuery();

  return <>
    <PageBreadcrumb current='我的面试' />
    <Interviews interviews={interviews} forCalibration={false}
      hideTotalCount />

    {calibrations && calibrations.length && <>
      <PageBreadcrumb current='面试讨论组' my={sectionSpacing} />
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
}, "我的面试");
