import { compareDate } from 'shared/strings';
import { trpcNext } from "trpc";
import { useMemo, useState } from 'react';
import UserCards, { FullTextSearchBox } from "components/UserCards";
import Loader from 'components/Loader';
import TopBar, { topBarPaddings } from 'components/TopBar';
import { componentSpacing, pageMarginX } from 'theme/metrics';
import { Heading, HStack, Spacer } from '@chakra-ui/react';
import { VStack } from '@chakra-ui/react';
import { fullPage } from 'AppPage';
import { ShowOnDesktop, ShowOnMobile } from 'components/Show';

const title = "志愿者档案";

export default fullPage(() => {
  const { data } = trpcNext.users.listVolunteers.useQuery();
  const sorted = useMemo(() => 
    data?.sort((a, b) => compareDate(b.updatedAt, a.updatedAt)), [data]);

  const [searchTerm, setSearchTerm] = useState<string>("");

  return <>
    <TopBar {...topBarPaddings}>
      <VStack spacing={componentSpacing} align="start">

        <HStack spacing={componentSpacing} width="full">
          <ShowOnDesktop>
            <Heading size="md" whiteSpace="nowrap">{title}</Heading>
          </ShowOnDesktop>

          <Spacer />

          <FullTextSearchBox
            value={searchTerm}
            setValue={setSearchTerm}
            narrow 
          />
        </HStack>
      </VStack>
    </TopBar>

    <VStack
      spacing={componentSpacing}
      align="start"
      mx={pageMarginX}
      mt={pageMarginX}
    >
      <ShowOnMobile>
        <Heading size="md">{title}</Heading>
      </ShowOnMobile>

      {!sorted ? <Loader /> : <UserCards type="Volunteer" users={sorted}
        searchTerm={searchTerm} />}
    </VStack>
  </>;
}, title);
