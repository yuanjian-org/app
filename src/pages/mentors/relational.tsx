import {
  Text,
  VStack,
  UnorderedList,
  ListItem,
  Link,
  Icon,
} from '@chakra-ui/react';
import { useEffect, useState } from "react";
import { trpcNext } from "trpc";
import { componentSpacing, sectionSpacing, textMaxWidth } from 'theme/metrics';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo } from 'react';
import { useUserContext } from 'UserContext';
import UserCards, { TraitsMatchingScore } from "components/UserCards";
import { RepeatIcon } from '@chakra-ui/icons';
import { dailyShuffle } from 'pages/mentors';
import { computeMatchingScore, isTraitsComplete, TraitsModal } from 'components/Traits';
import { MinUserAndProfile, UserProfile } from 'shared/UserProfile';

export default widePage(() => {
  const [me] = useUserContext();

  const { data } = trpcNext.users.listMentorProfiles.useQuery();
  const [profile, setProfile] = useState<UserProfile>();

  const shuffled = useMemo(() => {
    if (!profile || !data) return undefined;

    type UserProfileAndScore = MinUserAndProfile & TraitsMatchingScore;
    const compare = (a: UserProfileAndScore, b: UserProfileAndScore) => {
      return (a.traitsMatchingScore ?? 0) - (b.traitsMatchingScore ?? 0);
    };

    const filtered = data.filter(m => m.relational).map(m => {
      const score = computeMatchingScore(profile, m.traitsPreference);
      console.log("traitsMatchingScore", m.user.name, score);
      return {
        ...m,
        traitsMatchingScore: score,
      };
    });

    return dailyShuffle(filtered, me.id, compare);
  }, [data, me, profile]);

  return <>
    <PageBreadcrumb current="浏览一对一导师" />

    <VStack
      spacing={componentSpacing}
      mb={sectionSpacing}
      align="start"
      maxW={textMaxWidth}
    >
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
    </VStack>

    {shuffled && <UserCards type="RelationalMentor" users={shuffled} />}

    <TraitsLinkAndModal setProfile={setProfile} />
  </>;
}, "浏览一对一导师");

function TraitsLinkAndModal({ setProfile }: { 
  setProfile: (profile: UserProfile) => void 
}) {
  const [me] = useUserContext();
  const { data, refetch } = trpcNext.users.getUserProfile.useQuery({ 
    userId: me.id });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const t = data?.profile?.特质;
    if (t && isTraitsComplete(t)) {
      setProfile({
        ...data.profile,
        特质: t,
      });
    } else {
      setIsModalOpen(true);
    }
  }, [data, setProfile]);

  return <>
    <Text mt={sectionSpacing}>
      <Link onClick={() => setIsModalOpen(true)}>
        <Icon as={RepeatIcon} mr={1} />
        修改个人特点，更新推荐结果
      </Link>
    </Text>

    {isModalOpen && <TraitsModal onClose={() => {
      setIsModalOpen(false);
      // Refetch to make sure all fields are present. See useEffect above.
      void refetch();
    }} />}
  </>;
}
