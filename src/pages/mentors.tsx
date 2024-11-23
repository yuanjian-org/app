import {
  Text,
  Button,
  VStack,
  UnorderedList,
  ListItem,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { hash } from 'shared/strings';
import { trpcNext } from "trpc";
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import { MinUserAndProfile } from 'shared/UserProfile';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo, useState } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import { useUserContext } from 'UserContext';
import UserCards, { MentorCardType } from "components/UserCards";

export default widePage(() =>
  <MentorPage type="AdhocMentor" title="预约不定期导师" />,
  "预约不定期导师");

export function MentorPage({ type, title }: {
  type: MentorCardType,
  title: string,
}) {
  const [me] = useUserContext();
  const [booking, setBooking] = useState<boolean>();

  const { data } = trpcNext.users.listMentorProfiles.useQuery();
  const shuffled = useMemo(() => {
    const filtered = data?.filter(m =>
      type == "MachableMentor" ? m.matchable : true);
    return filtered ? dailyShuffle(filtered, me.id) : undefined;
  }, [data, type, me]);

  return <>
    <PageBreadcrumb current={title} />

    <VStack
      spacing={componentSpacing}
      mb={sectionSpacing}
      align="start"
      maxW="800px"
    >
      {type == "MachableMentor" ? <>
        {/* 一对一导师说明文字 */}
        <Text><b>如何选择导师？</b>在你开始选择一对一导师之前，我们想讲一下一对一导师的{
        }意义和我们的期望，希望能帮你更好地做选择：</Text>

        <UnorderedList>
          <ListItem>
            我们发现有不少同学会更请倾向于选一个跟自己专业对口，可以在这方面对自己有多帮助。{
            }这当然是一个非常不错的选择，但是如果只以此为标准，你有可能会错过导师能带给你的{
            }更多可能性。
          </ListItem>
          <ListItem>
            我们从小的教育基本都是以学业，为以后的事业做准备，相比之下比较少关注我们作为一{
            }个人成长中的其他部分，比如如何处人相处，如何计划自己的生活，如何与自己的亲人或{
            }者爱人相处，如何全方面的成为更好的自己。我们希望一对一导师会成为你{
            }可以信赖的朋友、可以倾述烦恼和寻求新视角的人。更重要的是，导师会{
            }根据你的实际情况和需要，与你一起为更好的自己而努力。
          </ListItem>
          <ListItem>
            你的一对一导师应该是一位你愿与ta成为亲密朋友的人，愿意与ta{
            }分享快乐和悲伤。哪怕当ta跟你讲一些枯燥的道理时，也是用一种你可以接受的方式{
            }交流。另外，你不用担心你与一位导师匹配之后便与其他导师无缘。{
            }你可以通过“预约不定期导师”功能，随时与其他导师预约交流的时间。
          </ListItem>
        </UnorderedList>
      </>
      :
      <>
        {/* 不定期导师说明文字 */}
        <Text>欢迎你随时随地预约任何一位不定期导师，交流任何你关心的话题，比如：</Text>

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
            或者，预约你选中的导师：
          </WrapItem>
        </Wrap>
      </>}
    </VStack>

    <UserCards type={type} users={shuffled} />

    {booking &&
      <MentorBookingModal mentor={null} onClose={() => setBooking(false)} />
    }
  </>;
}

/**
 * Returns an array sorted in a deterministic "random" order.
 * The order is consistent from 4am of the current day to 4am of the next day,
 * and is influenced by the length of the array and a specified UUID
 * (which should be the current user id).
 */
function dailyShuffle(users : MinUserAndProfile[], uuid: string) {
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

  // Then shuffle the array deterministically based on the seed
  return users.sort(() => rng() - 0.5);
}
