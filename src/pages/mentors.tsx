import getI18nProps from "components/getI18nProps";
import T from "components/T";
import { Text, Button, VStack } from "@chakra-ui/react";
import { hash } from "shared/strings/hash";
import { trpcNext } from "trpc";
import { breakpoint } from "theme/breakpoints";
import { componentSpacing, pageMarginX, sectionSpacing } from "theme/metrics";
import { fullPage } from "AppPage";
import { useMemo, useState } from "react";
import MentorBookingModal from "components/MentorBookingModal";
import UserCards from "components/UserCards";
import { FullTextSearchBox } from "components/FullTextSearchBox";
import { UserDisplayData } from "../components/UserPanel";
import Loader from "components/Loader";
import useMe from "useMe";
import TopBar from "components/TopBar";
import { topBarPaddings } from "components/TopBar";
import { features } from "shared/Features";
import Head from "next/head";
import { isPermitted } from "shared/Role";
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
        <title>
          {title} <T>| 远图</T>
        </title>
      </Head>

      <TopBar
        {...topBarPaddings()}
        pb={{
          base: componentSpacing,
          [breakpoint]: sectionSpacing,
        }}
      >
        <VStack spacing={componentSpacing} align="start">
          {isMentee && (
            <>
              <Text>
                欢迎你随时预约择业就业、面试辅导、情感困惑等任何你关心的话题：
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

/**
 * Returns an array sorted in a deterministic "random" order.
 * The order is consistent from 4am of the current day to 4am of the next day,
 * and is influenced by the length of the array and a specified UUID
 * (which should be the current user id).
 */
export function dailyShuffle(
  users: UserDisplayData[],
  uuid: string,
  compare?: (a: UserDisplayData, b: UserDisplayData) => number,
) {
  const now = new Date();
  const local4am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    4,
    0,
    0,
  );

  // If current time is before 4am, consider it the previous day.
  if (now < local4am) {
    local4am.setDate(local4am.getDate() - 1);
  }

  // Generate a seeded random number generator
  function seededRandom(seed: number): () => number {
    // Linear congruential generator, by ChatGPT
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  const seed = hash(`${local4am.getTime()}-${users.length}-${uuid}`);
  const rng = seededRandom(seed);

  // First sort the array in a deterministic order
  users.sort((a, b) => a.user.id.localeCompare(b.user.id));

  // Then shuffle the array deterministically based on the seed, but first
  // sort the array based on the compare function if provided.
  return users.sort((a, b) => {
    const comp = compare ? compare(a, b) : 0;
    if (comp !== 0) return comp;
    return rng() - 0.5;
  });
}
export const getStaticProps = getI18nProps;
