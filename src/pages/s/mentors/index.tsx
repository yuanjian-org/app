import { Flex, Heading, VStack } from "@chakra-ui/react";
import { trpcNext } from "trpc";
import { componentSpacing, pageMarginX } from "theme/metrics";
import { useMemo, useState } from "react";
import UserCards from "components/UserCards";
import { FullTextSearchBox } from "components/FullTextSearchBox";
import { dailyShuffle } from "components/dailyShuffle";
import { features } from "shared/Features";
import ErrorPage from "next/error";
import { widePage } from "../../../AppPage";
import Loader from "components/Loader";

export default widePage(() => {
  if (!features.publicOrgsMentors) return <ErrorPage statusCode={404} />;
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data } = trpcNext.users.listMentorsPublic.useQuery();
  const shuffled = useMemo(
    () => (data ? dailyShuffle(data, "public") : undefined),
    [data],
  );

  return (
    <>
      <VStack spacing={componentSpacing} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg">导师一览</Heading>
        </Flex>
        <FullTextSearchBox value={searchTerm} setValue={setSearchTerm} />
      </VStack>

      {!shuffled ? (
        <Loader />
      ) : (
        <UserCards
          type="TransactionalMentor"
          users={shuffled}
          searchTerm={searchTerm}
          mx={pageMarginX}
          mt={pageMarginX}
          isPublic={true}
        />
      )}
    </>
  );
}, "导师一览");

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
