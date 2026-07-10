import { VStack } from "@chakra-ui/react";
import { trpcNext } from "trpc";
import { breakpoint } from "theme/breakpoints";
import { componentSpacing, pageMarginX, sectionSpacing } from "theme/metrics";
import { fullPage } from "AppPage";
import { useMemo, useState } from "react";
import UserCards from "components/UserCards";
import { FullTextSearchBox } from "components/FullTextSearchBox";
import Loader from "components/Loader";
import TopBar from "components/TopBar";
import { topBarPaddings } from "components/TopBar";
import Head from "next/head";
import getI18nProps from "components/getI18nProps";
import { getTransactionalMentorsPageTitle, dailyShuffle } from "pages/mentors";

export default fullPage(() => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data } = trpcNext.users.listPublicMentors.useQuery();
  // Using a dummy UUID for public users
  const shuffled = useMemo(
    () => (data ? dailyShuffle(data, "public-user") : undefined),
    [data],
  );
  const title = getTransactionalMentorsPageTitle(false);

  return (
    <>
      <Head>
        <title>{title} | 远图</title>
      </Head>

      <TopBar
        {...topBarPaddings()}
        pb={{ base: componentSpacing, [breakpoint]: sectionSpacing }}
      >
        <VStack spacing={componentSpacing} align="start">
          <FullTextSearchBox value={searchTerm} setValue={setSearchTerm} />
        </VStack>
      </TopBar>

      {!shuffled ? (
        <Loader alignSelf="flex-start" />
      ) : (
        <UserCards
          type="TransactionalMentor"
          users={shuffled}
          searchTerm={searchTerm}
          mx={pageMarginX}
          mt={pageMarginX}
        />
      )}
    </>
  );
});

export const getStaticProps = getI18nProps;
