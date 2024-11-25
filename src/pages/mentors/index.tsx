import {
  Text,
  SimpleGrid,
  Heading,
  Button,
  Image,
  VStack,
  Box,
  HStack,
  CardProps,
  Link,
  UnorderedList,
  ListItem,
  Spacer,
  Wrap,
  WrapItem,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName, hash, toPinyin, truncate } from 'shared/strings';
import { trpcNext } from "trpc";
import { breakpoint, componentSpacing, sectionSpacing } from 'theme/metrics';
import { MinUser } from 'shared/User';
import { UserProfile } from 'shared/UserProfile';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { Card, CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import { useUserContext } from 'UserContext';
import { SearchIcon } from '@chakra-ui/icons';
import { visibleUserProfileFields } from './[mentorId]';

export default widePage(() =>
  <MentorPage matchable={false} title="预约不定期导师" />,
  "预约不定期导师");

type UserAndProfile = {
  user: MinUser,
  profile: UserProfile | null,
};

/**
 * There are two types of mentors:
 * 
 * *matchable* mentors can match mentees for long-term mentorship and also have
 * one-off sessions with any mentee on demand.
 * 
 * *adhoc* mentors cannot match for long-term mentorship and only perform
 * one-off session.
 */
export function MentorPage({ matchable, title }: {
  matchable: boolean,
  title: string,
}) {
  const [me] = useUserContext();
  const [searchTerm, setSearchTerm] = useState<string>();
  // Set to null to book with any mentor
  const [bookingMentor, setBookingMentor] = useState<MinUser | null>();

  const { data } = trpcNext.mentorships.listMentors.useQuery();

  const shuffled = useMemo(() => {
    const filtered = data?.filter(m => matchable ? m.matchable : true);
    return filtered ? dailyShuffle(filtered, me.id) : undefined;
  }, [data, matchable, me]);

  const searchResult = useMemo(() => {
    return shuffled && searchTerm ? search(shuffled, searchTerm) : shuffled;
  }, [searchTerm, shuffled]); 

  return <>
    <PageBreadcrumb current={title} />

    <VStack
      spacing={componentSpacing}
      align="start"
      maxW="800px"
    >
      {matchable ? <>
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
            <Button variant="brand" onClick={() => setBookingMentor(null)}>
              我有一个话题想聊，请帮我选择适合的导师
            </Button>
          </WrapItem>
          <WrapItem>
            或者，预约你选中的导师：
          </WrapItem>
        </Wrap>
      </>}
    </VStack>

    {!searchResult ? <Loader /> : <>

      {/* Search box */}
      <InputGroup my={sectionSpacing}>
        <InputLeftElement><SearchIcon color="gray" /></InputLeftElement>
        <Input
          autoFocus
          type="search"
          placeholder='搜索关键字，比如“金融“、“女”、“成都”，支持拼音'
          value={searchTerm}
          onChange={ev => setSearchTerm(ev.target.value)}
        />
      </InputGroup>

      {/* Desktop version */}
      <SimpleGrid
        display={{ base: "none", [breakpoint]: "grid" }}
        spacing={componentSpacing}
        templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
      >
        {searchResult.map(m => <MentorCardForDesktop
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          matchable={matchable}
          openModal={() => setBookingMentor(m.user)}
        />)}
      </SimpleGrid>

      {/* Mobile version */}
      <SimpleGrid
        display={{ base: "grid", [breakpoint]: "none" }}
        spacing={componentSpacing}
        templateColumns='1fr'
      >
        {searchResult.map(m => <MentorCardForMobile
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          matchable={matchable}
          openModal={() => setBookingMentor(m.user)}
        />)}
      </SimpleGrid>
          
      {bookingMentor !== undefined && 
        <MentorBookingModal
          mentor={bookingMentor} 
          onClose={() => setBookingMentor(undefined)}
        />
      }
    </>}
  </>;
}

/**
 * Returns an array sorted in a deterministic "random" order.
 * The order is consistent from 4am of the current day to 4am of the next day,
 * and is influenced by the length of the array and a specified UUID
 * (which should be the current user id).
 */
function dailyShuffle(mentors : UserAndProfile[], uuid: string) {
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

  const seed = hash(`${local4am.getTime()}-${mentors.length}-${uuid}`);
  const rng = seededRandom(seed);

  // First sort the array in a deterministic order
  mentors.sort((a, b) => a.user.id.localeCompare(b.user.id));

  // Then shuffle the array deterministically based on the seed
  return mentors.sort(() => rng() - 0.5);
}

function search(mentors: UserAndProfile[], searchTerm: string) {
  const pinyinTerm = toPinyin(searchTerm);

  const match = (v: string | null | undefined | any) => {
    return v && (v.includes(searchTerm) || toPinyin(v).includes(pinyinTerm));
  };

  return mentors.filter(m => match(m.user.name) || (m.profile && (
    match(m.profile.性别) ||
    visibleUserProfileFields.some(fl => match(m.profile?.[fl.field])))));
}

function MentorCard({ userId, matchable, children, ...rest }: {
  userId: string,
  matchable: boolean,
} & CardProps) {
  const router = useRouter();
  const url = `/mentors/${userId}${matchable ? "?nobooking=1" : ""}`;

  return <Card
    overflow="hidden"
    cursor="pointer"
    onClick={() => router.push(url)}
    {...rest}
  >
    {children}
  </Card>;
}

function MentorCardForDesktop({ user, profile: p, matchable, openModal }: {
  user: MinUser,
  profile: UserProfile | null,
  matchable: boolean,
  openModal: () => void,
}) {

  return <MentorCard userId={user.id} matchable={matchable}>

    <FullWidthImageSquare profile={p} />

    <CardHeader>
      <Heading size='md' color="gray.600">
        {formatUserName(user.name, "formal")}
      </Heading>
    </CardHeader>
    <CardBody pt={1}>
      <VStack align="start">
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
        {matchable ? <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.擅长话题 && <Text><b>擅长聊</b>：{p.擅长话题}</Text>}
          {p?.成长亮点 && <Text><b>成长亮点</b>：{truncate(p.成长亮点, 80)}</Text>}
        </> : <>
          {p?.专业领域 && <Text><b>专业</b>：{p.专业领域}</Text>}
          {p?.职业经历 && <Text>{truncate(p.职业经历, 80)}</Text>}
        </>}
      </VStack>
    </CardBody>
    <CardFooter>
      <Button>更多信息</Button>

      {!matchable && <>
        <Spacer />
        <Button variant="brand" onClick={ev => {
          ev.stopPropagation();
          openModal();
        }}>预约</Button>
      </>}
    </CardFooter>
  </MentorCard>;
}

/**
 * This component ensures the image fill the container's width and is cropped
 * into a square.
 */
function FullWidthImageSquare({ profile }: {
  profile: UserProfile | null
}) {
  return <Box
    position="relative"
    width="100%"
    // This hack enforces a square aspect ratio for the container. The
    // percentage is based on the width, so paddingBottom="100%" ensures the
    // height equals the width.
    paddingBottom="100%"
  >
    <Image
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      objectFit='cover'
      src={
        profile?.照片链接 ? profile.照片链接 :
        profile?.性别 == "男" ? "/img/placeholder-male.png" :
        "/img/placeholder-female.png"
      }
      alt="照片"
    />
  </Box>;
}

function MentorCardForMobile({ user, profile: p, matchable, openModal }: {
  user: MinUser,
  profile: UserProfile | null,
  matchable: boolean,
  openModal: () => void,
}) {
  // Roughly five lines of text on iPhone 12 Pro.
  const maxLen = 75;

  return <MentorCard
    userId={user.id}
    size="sm"
    variant="unstyled"
    boxShadow="sm"
    matchable={matchable}
  >
    <HStack
      spacing={componentSpacing}
      fontSize="sm"
      // Align content to the top
      align="start"
      // To anchor the <Link> below
      position="relative"
    >
      <VStack
        spacing={componentSpacing}
        mb={componentSpacing}
        // Align content to the left
        align="start"
      >
        <Box width="100px">
          <FullWidthImageSquare profile={p} />
        </Box>

        <VStack
          ml={componentSpacing}
          // Align content to the left
          align="start"
        >
          <Heading size='sm' color="gray.600">
            {formatUserName(user.name, "formal")}
          </Heading>

          {matchable ? 
            p?.现居住地 && <Text>{p.现居住地}</Text>
            :
            p?.专业领域 && <Text>{p.专业领域}</Text>
          }
        </VStack>
      </VStack>

      <VStack
        my={componentSpacing}
        me={componentSpacing}
        // Align content to the left
        align="start"
        // Preserve space for the <Link> below
        pb={3 + componentSpacing}
      >
        {matchable ? <>
          {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
          {p?.擅长话题 && <Text>擅长聊：{truncate(p.擅长话题, maxLen)}</Text>}
        </> : <>
          {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
          {p?.职业经历 && <Text>{truncate(p.职业经历, maxLen)}</Text>}
        </>}
      </VStack>

      {/* Position it to the bottom right corner of the card */}
      <HStack
        spacing={2}
        position="absolute"
        bottom={componentSpacing}
        right={componentSpacing}
      >
        <Link>更多信息</Link>

        {!matchable && <>
          <Text color="gray.400">|</Text>
          <Link onClick={ev => {
            ev.stopPropagation();
            openModal();
          }}>预约</Link>
        </>}
      </HStack>
    </HStack>
  </MentorCard>;
}
