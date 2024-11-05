import {
  Text,
  SimpleGrid,
  Heading,
  Button,
  Image,
  VStack,
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName } from 'shared/strings';
import { trpcNext } from "trpc";
import { componentSpacing } from 'theme/metrics';
import { MinUser } from 'shared/User';
import { MentorProfile } from 'shared/MentorProfile';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { Card, CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default widePage(() => <MentorPage title="不定期导师" />, "不定期导师");

/**
 * TODO: this file closely resembles interviewers.tsx. Dedupe?
 */
export function MentorPage({ matchableOnly, title }: {
  matchableOnly?: boolean,
  title: string,
}) {
  const { data, isLoading } = trpcNext.mentorships.listMentors.useQuery();

  return <>
    <PageBreadcrumb current={title} />

    {isLoading ? <Loader /> : <SimpleGrid
      spacing={componentSpacing}
      // templateColumns='1fr'
      templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
    >
      {data?.filter(
        m => matchableOnly ? m.matchable : true
      ).map(m => <MentorCard
        key={m.user.id}
        user={m.user}
        profile={m.profile}
      />)}
    </SimpleGrid>}
  </>;
}

function MentorCard({ user, profile: p }: {
  user: MinUser,
  profile: MentorProfile | null
}) {
  const router = useRouter();

  return <Card
    overflow="hidden"
    cursor="pointer"
    onClick={() => router.push(`/mentors/${user.id}`)}
  >

    {p?.照片链接 && <Image
      objectFit='cover'
      maxW={{ base: '100%' }}
      src={p.照片链接}
      alt="照片"
    />}

    <CardHeader>
      <Heading size='md' color="gray.600">
        {formatUserName(user.name, "formal")}
      </Heading>
    </CardHeader>
    <CardBody pt={1}>
      <VStack align="start">
        {p?.身份头衔 && <Text>{p.身份头衔}</Text>}
        {p?.擅长辅导领域 && <Text><b>擅长辅导</b>：{p.擅长辅导领域}</Text>}
      </VStack>
    </CardBody>
    <CardFooter>
      <Button>更多信息</Button>
    </CardFooter>
  </Card>;
}
