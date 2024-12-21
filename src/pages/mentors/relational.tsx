import {
  Text,
  VStack,
  UnorderedList,
  ListItem,
  Link,
  OrderedList,
} from '@chakra-ui/react';
import { useEffect, useState } from "react";
import { trpcNext } from "trpc";
import { componentSpacing, sectionSpacing, textMaxWidth } from 'theme/metrics';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo } from 'react';
import { useUserContext } from 'UserContext';
import UserCards, { MentorStar, UserProfileAndScore } from "components/UserCards";
import { dailyShuffle } from 'pages/mentors';
import { TraitsModal } from 'components/Traits';
import { hardMismatchScore, isTraitsComplete } from "shared/Traits";
import { computeTraitsMatchingScore } from "shared/Traits";
import { UserProfile } from 'shared/UserProfile';
import NextLink from 'next/link';

export default widePage(() => {
  const [me] = useUserContext();

  const { data } = trpcNext.users.listMentorProfiles.useQuery();
  const [profile, setProfile] = useState<UserProfile>();

  const { data: applicant } = trpcNext.users.getApplicant.useQuery({
    type: "MenteeInterview",
    userId: me.id,
  });

  const shuffled = useMemo(() => {
    if (!profile || !data || !applicant) return undefined;

    const filtered: UserProfileAndScore[] = data
      .filter(m => m.relational)
      .map(m => {
        const score = computeTraitsMatchingScore(
          profile,
          applicant.application,
          m.traitsPreference,
        );
        console.log("traitsMatchingScore", m.user.name, score);
        return {
          ...m,
          traitsMatchingScore: score,
        };
      })
      // Filter out hard mismatching mentors
      .filter(m => m.traitsMatchingScore !== hardMismatchScore);

    const compare = (a: UserProfileAndScore, b: UserProfileAndScore) => {
      return (b.traitsMatchingScore ?? 0) - (a.traitsMatchingScore ?? 0);
    };
    return dailyShuffle(filtered, me.id, compare);
  }, [data, me, profile, applicant]);

  return <>
    <PageBreadcrumb current="选择一对一导师" />

    <VStack
      spacing={componentSpacing}
      mb={sectionSpacing}
      align="start"
      maxW={textMaxWidth}
    >
      <Text>
        在浏览导师信息之前，我们希望向你传达社会导师的意义与目标，以便你做出更好的选择：
      </Text>
      <UnorderedList fontSize="sm">
        <ListItem>
          首先，一对一导师将提供长期的陪伴与指导，在帮助你顺利度过校园时光的同时，为将来步入职场和社会做好准备，我们期待能够助力年轻人实现理想并承担社会责任。
        </ListItem>
        <ListItem>
          其次，一对一导师是传统教育的有效补充，我们聚焦于提高综合素养及软实力、而非提供专业学科知识。在定期交流中，你可与导师展开一系列广泛的交流，如生活与学习、爱好与情感、理想与未来、科技与社会发展、或其他任何你感兴趣的话题。
        </ListItem>
        <ListItem>
          最后，一对一导师期待与你建立好友般亲密、平等、互信的关系、而非传统的师生模式，导师将与你并肩前行和成长。
        </ListItem>
      </UnorderedList>

      <Text>
        基于以上内容，我们建议你选择时：
      </Text>
      <OrderedList fontSize="sm">
        <ListItem>
          避免将“专业对口”作为唯一标准，非同专业的导师往往能够为你提供更广阔的视角和多元的思维方式，有益于延伸个人发展可能性；
        </ListItem>
        <ListItem>
          可关注导师的成长背景、兴趣爱好、沟通风格等信息，请用“交朋友”的心态来选择你乐于与其交流的导师；
        </ListItem>
        <ListItem>
          无须担心在匹配完一对一导师后失去与其他导师沟通的机会，你随时可通过
          <Link as={NextLink} href="/mentors">预约不定期导师</Link>
          获得与社区内其他导师交流的机会。
        </ListItem>
      </OrderedList>

      <TraitsLinkAndModal setProfile={setProfile} />
    </VStack>

    {shuffled && <UserCards type="RelationalMentor" users={shuffled} />}
  </>;
}, "选择一对一导师");

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
      setProfile(data.profile);
    } else {
      setIsModalOpen(true);
    }
  }, [data, setProfile]);

  return <>
    <Text>
      <b>标有
      <MentorStar mx={1.5} />
      的是推荐导师。</b>他们的匹配偏好与你的
      <Link onClick={() => setIsModalOpen(true)}>
        个人特质
      </Link>
      有较高的契合。
    </Text>

    {isModalOpen && <TraitsModal onClose={() => {
      setIsModalOpen(false);
      // Refetch to make sure all fields are present. See useEffect above.
      void refetch();
    }} />}
  </>;
}
