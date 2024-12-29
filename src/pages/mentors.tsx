import {
  Text,
  Button,
  VStack,
  UnorderedList,
  ListItem,
  Wrap,
  WrapItem,
  Heading,
} from '@chakra-ui/react';
import { hash } from 'shared/strings';
import { trpcNext } from "trpc";
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo, useState } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import UserCards from "components/UserCards";
import { UserDisplayData } from './users/[userId]';
import Loader from 'components/Loader';
import useMe from 'useMe';

export default widePage(() => {
  const me = useMe();
  const [booking, setBooking] = useState<boolean>();

  const { data } = trpcNext.users.listMentors.useQuery();
  const shuffled = useMemo(() => 
    data ? dailyShuffle(data, me.id) : undefined, [data, me]);

  return <>
    <PageBreadcrumb current="根据话题预约" />

    <VStack
      spacing={componentSpacing}
      mb={sectionSpacing}
      align="start"
      maxW="800px"
    >
      <Text>欢迎你随时预约交流任何你关心的话题，比如：</Text>

      <UnorderedList>
        <ListItem>简历诊断与模拟面试</ListItem>
        <ListItem>就业咨询与职业规划</ListItem>
        <ListItem>生活与情感类话题</ListItem>
        <ListItem>人生选择与规划</ListItem>
        <ListItem>其他困扰你的问题</ListItem>
      </UnorderedList>

      <Wrap spacing={componentSpacing} align="center">
        <WrapItem>
          <Button variant="brand" onClick={() => setBooking(true)}>
            我有一个话题想聊，请帮我选择适合的导师
          </Button>
        </WrapItem>
        <WrapItem>
          
        </WrapItem>
      </Wrap>

      <Text>或者：</Text>

      <Heading size="md" mt={componentSpacing}>
        预约指定导师
      </Heading>
    </VStack>

    {!shuffled ? <Loader alignSelf="flex-start" /> :
      <UserCards type="TransactionalMentor" users={shuffled} />}

    {booking &&
      <MentorBookingModal mentor={null} onClose={() => setBooking(false)} />
    }
  </>;
}, "预约不定期导师");

/**
 * Returns an array sorted in a deterministic "random" order.
 * The order is consistent from 4am of the current day to 4am of the next day,
 * and is influenced by the length of the array and a specified UUID
 * (which should be the current user id).
 */
export function dailyShuffle(users : UserDisplayData[], uuid: string, 
  compare?: (a: UserDisplayData, b: UserDisplayData) => number)
{
  const now = new Date();
  const local4am = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
    4, 0, 0);

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
