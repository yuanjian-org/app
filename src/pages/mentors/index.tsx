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
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName, truncate } from 'shared/strings';
import { trpcNext } from "trpc";
import { breakpoint, componentSpacing } from 'theme/metrics';
import { MinUser } from 'shared/User';
import { UserProfile } from 'shared/UserProfile';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { Card, CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

export default widePage(() => <MentorPage matchable={false} title="不定期导师" />,
  "不定期导师");

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
  const { data, isLoading } = trpcNext.mentorships.listMentors.useQuery();
  const filtered = useMemo(() => data?.filter(
    m => matchable ? m.matchable : true
  ), [data, matchable]);

  return <>
    <PageBreadcrumb current={title} />

    <Text color="red">此页仍在开发中。仅管理员能够访问。</Text>

    {isLoading ? <Loader /> : <>
      {/* Desktop version */}
      <SimpleGrid
        display={{ base: "none", [breakpoint]: "grid" }}
        spacing={componentSpacing}
        templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
      >
        {filtered?.map(m => <MentorCardForDesktop
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          matchable={matchable}
        />)}
      </SimpleGrid>

      {/* Mobile version */}
      <SimpleGrid
        display={{ base: "grid", [breakpoint]: "none" }}
        spacing={componentSpacing}
        templateColumns='1fr'
      >
        {filtered?.map(m => <MentorCardForMobile
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          matchable={matchable}
        />)}
      </SimpleGrid>

    </>}
  </>;
}

function MentorCard({ userId, children, ...rest }: {
  userId: string,
} & CardProps) {
  const router = useRouter();

  return <Card
    overflow="hidden"
    cursor="pointer"
    onClick={() => router.push(`/mentors/${userId}`)}
    {...rest}
  >
    {children}
  </Card>;
}

function MentorCardForDesktop({ user, profile: p, matchable }: {
  user: MinUser,
  profile: UserProfile | null,
  matchable: boolean,
}) {

  return <MentorCard userId={user.id}>

    <FullWidthImageSquare profile={p} />

    <CardHeader>
      <Heading size='md' color="gray.600">
        {formatUserName(user.name, "formal")}
      </Heading>
    </CardHeader>
    <CardBody pt={1}>
      <VStack align="start">
        {matchable ? <>
          {p?.身份头衔 && <Text>{p.身份头衔}</Text>}
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.擅长话题 && <Text><b>擅长聊</b>：{p.擅长话题}</Text>}
          {p?.成长亮点 && <Text><b>成长亮点</b>：{truncate(p.成长亮点, 80)}</Text>}
        </> : <>
          {p?.身份头衔 && <Text>{p.身份头衔}</Text>}
          {p?.专业领域 && <Text><b>专业</b>：{p.专业领域}</Text>}
          {p?.职业经历 && <Text>{truncate(p.职业经历, 80)}</Text>}
        </>}
      </VStack>
    </CardBody>
    <CardFooter>
      <Button>更多信息</Button>
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

function MentorCardForMobile({ user, profile: p, matchable }: {
  user: MinUser,
  profile: UserProfile | null,
  matchable: boolean,
}) {
  // Roughly five lines of text on iPhone 12 Pro.
  const maxLen = 75;

  return <MentorCard
    userId={user.id}
    size="sm"
    variant="unstyled"
    boxShadow="sm"
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
      <Link
        position="absolute"
        bottom={componentSpacing}
        right={componentSpacing}
      >更多信息</Link>
    </HStack>
  </MentorCard>;
}
