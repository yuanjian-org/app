import {
  Text,
  SimpleGrid,
  Heading,
  Button,
  Image,
  VStack,
  Box,
  HStack,
  Link,
  Spacer,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Tooltip,
  TextProps, BoxProps
} from '@chakra-ui/react';
import { formatUserName, toPinyin } from 'shared/strings';
import { componentSpacing, paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { getUserUrl, MinUser } from 'shared/User';
import { MinUserAndProfile, UserProfile, StringUserProfile } from 'shared/UserProfile';
import { Card, CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useMemo, useState, useRef, useEffect, PropsWithChildren } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import { SearchIcon } from '@chakra-ui/icons';
import { ShowOnMobile, ShowOnDesktop } from './Show';
import KudosControl from './KudosControl';

export type FieldAndLabel = {
  field: keyof StringUserProfile;
  label?: string;
};

/**
 * UI displays these fields in the order of this array.
 */
export const visibleUserProfileFields: FieldAndLabel[] = [
  { field: "英文别名", label: "英文名" },
  { field: "身份头衔", label: "职位" },
  { field: "专业领域" },
  { field: "现居住地" },
  { field: "擅长话题", label: "擅长聊天话题" },
  { field: "成长亮点" },

  { field: "个性特点" },
  { field: "爱好与特长" },
  { field: "喜爱读物", label: "喜爱的书和媒体" },
  { field: "职业经历" },
  { field: "教育经历" },
  { field: "曾居住地" },
  { field: "生活日常" },
];

/**
 * See `docs/Glossary.md` for the definitions of these types.
 */
export type MentorCardType = "TransactionalMentor" | "RelationalMentor";
export type UserCardType = MentorCardType | "Volunteer";

export type UserCardData = MinUserAndProfile & {
  traitsMatchingScore?: number;
  likes?: number;
  kudos?: number;
};

const isMobile = typeof navigator !== 'undefined' &&
  /iPhone|iPad|Android/.test(navigator.userAgent);
const isMac = typeof navigator !== 'undefined' &&
  /macOS|Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

export default function UserCards({ type, users }: {
  type: UserCardType,
  users: UserCardData[],
}) {
  const [searchTerm, setSearchTerm] = useState<string>();
  // Set to null to book with any mentor
  const [bookingMentor, setBookingMentor] = useState<MinUser | null>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
    
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchInputRef]);

  const searchResult = useMemo(() => {
    return searchTerm ? search(users, searchTerm) : users;
  }, [searchTerm, users]); 

  return <>
    {searchResult && <>

      {/* Search box */}
      <InputGroup mb={sectionSpacing}>
        <InputLeftElement><SearchIcon color="gray" /></InputLeftElement>
        <Input
          ref={searchInputRef}
          bg="white"
          type="search"
          placeholder={
            (isMobile ? "" : ((isMac ? "⌘" : "Ctrl") + "+F ")) +
            `搜索关键字，比如“金融“、“女”、“成都”，支持拼音`
          }
          value={searchTerm}
          onChange={ev => setSearchTerm(ev.target.value)}
        />
      </InputGroup>

      <ShowOnDesktop>
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
        >
          {searchResult.map(d => <UserCardForDesktop
            key={d.user.id}
            data={d}
            type={type}
            openModal={() => setBookingMentor(d.user)}
            isMentorRecommended={isMentorRecommended(d.traitsMatchingScore)}
          />)}
        </SimpleGrid>
      </ShowOnDesktop>

      <ShowOnMobile>
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns='1fr'
        >
          {searchResult.map(d => <UserCardForMobile
            key={d.user.id}
            data={d}
            type={type}
            openModal={() => setBookingMentor(d.user)}
            isMentorRecommended={isMentorRecommended(d.traitsMatchingScore)}
          />)}
        </SimpleGrid>
      </ShowOnMobile>
          
      {bookingMentor !== undefined && 
        <MentorBookingModal
          mentor={bookingMentor} 
          onClose={() => setBookingMentor(undefined)}
        />
      }
    </>}
  </>;
}

function isMentorRecommended(traitsMatchingScore?: number) {
  return traitsMatchingScore !== undefined && traitsMatchingScore > 0;
}

function search(users: UserCardData[],
  searchTerm: string) 
{
  // Note that `toPinyin('Abc') returns 'Abc' without case change.
  const lower = searchTerm.trim().toLowerCase();

  const match = (v: string | null | undefined) => {
    if (!v) return false;
    const lowerV = v.toLowerCase();
    return [lowerV, toPinyin(lowerV)].some(s => s.includes(lower));
  };

  return users.filter(u => match(u.user.name) || (u.profile && (
    match(u.profile.性别) ||
    visibleUserProfileFields.some(fl => match(u.profile?.[fl.field])))));
}

function getUrl(user: MinUser, type: UserCardType) {
  return `${getUserUrl(user)}${type == "RelationalMentor" ? 
    "?booking=0&traits=1" : ""}`;
}

function UserCardForDesktop({
  data, type, openModal, isMentorRecommended
}: {
  data: UserCardData,
  type: UserCardType,
  openModal: () => void,
  isMentorRecommended: boolean,
}) {
  const router = useRouter();
  const p = data.profile;

  const visitUser = () => router.push(getUrl(data.user, type));

  return <Card overflow="hidden">

    <FullWidthImageSquare profile={p} onClick={visitUser} cursor="pointer" />

    <CardHeader>
      <Heading size='md' color="gray.600">
        {formatUserName(data.user.name, "formal")}
        {isMentorRecommended && <MentorStar ms={3} />}
      </Heading>
    </CardHeader>
    <CardBody pt={1}>
      <Flex direction="column" gap={paragraphSpacing}>
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
        {type == "TransactionalMentor" ? <>
          {p?.专业领域 && <Text><b>专业</b>：{p.专业领域}</Text>}
          {p?.职业经历 && <TruncatedText>{p.职业经历}</TruncatedText>}
        </> : type == "RelationalMentor" ? <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.擅长话题 && <TruncatedText><b>擅长聊</b>：{p.擅长话题}</TruncatedText>}
          {p?.成长亮点 && <TruncatedText>{p.成长亮点}</TruncatedText>}
        </> : <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.爱好与特长 && <TruncatedText>{p.爱好与特长}</TruncatedText>}
          {p?.生活日常 && <TruncatedText>{p.生活日常}</TruncatedText>}
        </>}
      </Flex>
    </CardBody>
    <CardFooter>
      <Button onClick={visitUser}>
        更多信息
      </Button>

      <Spacer />

      {type == "TransactionalMentor" && <>
        <Button variant="brand" onClick={ev => {
          ev.stopPropagation();
          openModal();
        }}>预约</Button>
      </>}

      {type == "Volunteer" && <KudosControl
        user={data.user}
        likes={data.likes ?? 0}
        kudos={data.kudos ?? 0}
      />}

    </CardFooter>
  </Card>;
}

function TruncatedText({ children }: PropsWithChildren) {
  return <Text noOfLines={5}>{children}</Text>;
}

/**
 * This component ensures the image fill the container's width and is cropped
 * into a square.
 */
function FullWidthImageSquare({ profile, ...rest }: {
  profile: UserProfile | null
} & BoxProps) {
  return <Box
    position="relative"
    width="100%"
    // This hack enforces a square aspect ratio for the container. The
    // percentage is based on the width, so paddingBottom="100%" ensures the
    // height equals the width.
    paddingBottom="100%"
    {...rest}
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

function UserCardForMobile({
  data, type, openModal, isMentorRecommended
}: {
  data: UserCardData,
  type: UserCardType,
  openModal: () => void,
  isMentorRecommended: boolean,
}) {
  const router = useRouter();
  const p = data.profile;

  const visitUser = () => router.push(getUrl(data.user, type));

  return <Card
    overflow="hidden"
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
        <Box width="100px" onClick={visitUser}>
          <FullWidthImageSquare profile={p} />
        </Box>

        <VStack
          ml={componentSpacing}
          // Align content to the left
          align="start"
        >
          <Heading size='sm' color="gray.600">
            {formatUserName(data.user.name, "formal")}
          </Heading>

          {type == "TransactionalMentor" ? 
            p?.专业领域 && <Text>{p.专业领域}</Text>
            :
            p?.现居住地 && <Text>{p.现居住地}</Text>
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
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}

        {type == "TransactionalMentor" ? <>
          {p?.职业经历 && <TruncatedText>{p.职业经历}</TruncatedText>}
        </> : type == "RelationalMentor" ? <>
          {p?.擅长话题 && <TruncatedText>擅长聊：{p.擅长话题}</TruncatedText>}
        </> : <>
          {p?.爱好与特长 && <TruncatedText>爱好：{p.爱好与特长}</TruncatedText>}
          {p?.生活日常 && <TruncatedText>日常：{p.生活日常}</TruncatedText>}
        </>}
      </VStack>

      {/* Position it to the bottom right corner of the card */}
      <HStack
        spacing={2}
        position="absolute"
        bottom={componentSpacing}
        right={componentSpacing}
      >
        {isMentorRecommended && <MentorStar me={2} />}

        <Link onClick={visitUser}>
          更多信息
        </Link>

        {type == "TransactionalMentor" && <>
          <Text color="gray.400">|</Text>
          <Link onClick={ev => {
            ev.stopPropagation();
            openModal();
          }}>预约</Link>
        </>}

        {type == "Volunteer" && <>
          <Text color="gray.400">|</Text>
          <KudosControl
            user={data.user}
            likes={data.likes ?? 0}
            kudos={data.kudos ?? 0}
          />
        </>}

      </HStack>
    </HStack>
  </Card>;
}

export function MentorStar(props: TextProps) {
  return <Tooltip label="该导师的匹配偏好与你的个人特质契合度较高。推荐仅供参考，选择权在你。">
    <Text display="inline" color="orange.600" {...props}>⭐</Text>
  </Tooltip>;
}
