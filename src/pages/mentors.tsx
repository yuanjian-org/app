import { Text, Button, VStack } from "@chakra-ui/react";
import { trpcNext } from "trpc";
import { breakpoint } from "theme/breakpoints";
import { componentSpacing, pageMarginX, sectionSpacing } from "theme/metrics";
import { fullPage } from "AppPage";
import { useMemo, useState } from "react";
import MentorBookingModal from "components/MentorBookingModal";
import UserCards from "components/UserCards";
import { FullTextSearchBox } from "components/FullTextSearchBox";
import Loader from "components/Loader";
import useMe from "useMe";
import TopBar from "components/TopBar";
import { topBarPaddings } from "components/TopBar";
import { features } from "shared/Features";
import Head from "next/head";
import { isPermitted } from "shared/Role";
import getI18nProps from "components/getI18nProps";
import T from "components/T";
import { dailyShuffle } from "components/dailyShuffle";

export function getTransactionalMentorsPageTitle(
  isMentee: boolean,
  enableRelational?: boolean,
) {
  return isMentee
    ? enableRelational
      ? "预约不定期导师"
      : "预约导师"
    : "导师一览";
}

export default fullPage(() => {
  const me = useMe();
  const isMentee = isPermitted(me.roles, "Mentee");
  const [booking, setBooking] = useState<boolean>();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data } = trpcNext.users.listMentors.useQuery();
  const shuffled = useMemo(
    () => (data ? dailyShuffle(data, me.id) : undefined),
    [data, me],
  );
  const title = getTransactionalMentorsPageTitle(isMentee, features.relational);

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
          {isMentee && (
            <>
              <Text>
                <T token="welcome-to-book">
                  欢迎你随时预约择业就业、面试辅导、情感困惑等任何你关心的话题：
                </T>
              </Text>

              <Button variant="brand" onClick={() => setBooking(true)}>
                <T>我有一个话题，请帮我预约适合的导师</T>
              </Button>

              <Text>
                <T>或者预约任何一位指定的导师：</T>
              </Text>
            </>
          )}

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

      {booking && (
        <MentorBookingModal mentor={null} onClose={() => setBooking(false)} />
      )}
    </>
  );
});

export const getStaticProps = getI18nProps;
