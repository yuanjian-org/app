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
  Spacer,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import { formatUserName, toPinyin, truncate } from 'shared/strings';
import { breakpoint, componentSpacing, sectionSpacing } from 'theme/metrics';
import { getUserUrl, MinUser } from 'shared/User';
import { MinUserAndProfile, UserProfile } from 'shared/UserProfile';
import { Card, CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useMemo, useState, useRef, useEffect } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import { SearchIcon } from '@chakra-ui/icons';

export type FieldAndLabel = {
  field: keyof UserProfile;
  label?: string;
};

/**
 * UI displays these fields in the order of this array.
 */
export const visibleUserProfileFields: FieldAndLabel[] = [
  { field: "身份头衔", label: "职位" },
  { field: "英文别名", label: "英文名" },
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

const isMobile = typeof navigator !== 'undefined' &&
  /iPhone|iPad|Android/.test(navigator.userAgent);
const isMac = typeof navigator !== 'undefined' &&
  /macOS|Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);

export default function UserCards({ type, users }: {
  type: UserCardType,
  users: MinUserAndProfile[] | undefined,
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
    return users && searchTerm ? search(users, searchTerm) : users;
  }, [searchTerm, users]); 

  return <>
    {!searchResult ? <Loader /> : <>

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

      {/* Desktop version */}
      <SimpleGrid
        display={{ base: "none", [breakpoint]: "grid" }}
        spacing={componentSpacing}
        templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
      >
        {searchResult.map(m => <UserCardForDesktop
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          type={type}
          openModal={() => setBookingMentor(m.user)}
        />)}
      </SimpleGrid>

      {/* Mobile version */}
      <SimpleGrid
        display={{ base: "grid", [breakpoint]: "none" }}
        spacing={componentSpacing}
        templateColumns='1fr'
      >
        {searchResult.map(m => <UserCardForMobile
          key={m.user.id}
          user={m.user}
          profile={m.profile}
          type={type}
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

function search(users: MinUserAndProfile[], searchTerm: string) {
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

function UserCard({ user, type, children, ...rest }: {
  user: MinUser,
  type: UserCardType,
} & CardProps) {
  const router = useRouter();
  const url = `${getUserUrl(user)}${type == "RelationalMentor" ? "?booking=0" : ""}`;

  return <Card
    overflow="hidden"
    cursor="pointer"
    onClick={() => router.push(url)}
    {...rest}
  >
    {children}
  </Card>;
}

function UserCardForDesktop({ user, profile: p, type, openModal }: {
  user: MinUser,
  profile: UserProfile | null,
  type: UserCardType,
  openModal: () => void,
}) {
  const maxLen = 80;

  return <UserCard user={user} type={type}>

    <FullWidthImageSquare profile={p} />

    <CardHeader>
      <Heading size='md' color="gray.600">
        {formatUserName(user.name, "formal")}
      </Heading>
    </CardHeader>
    <CardBody pt={1}>
      <VStack align="start">
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
        {type == "TransactionalMentor" ? <>
          {p?.专业领域 && <Text><b>专业</b>：{p.专业领域}</Text>}
          {p?.职业经历 && <Text>{truncate(p.职业经历, 80)}</Text>}
        </> : type == "RelationalMentor" ? <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.擅长话题 && <Text><b>擅长聊</b>：{p.擅长话题}</Text>}
          {p?.成长亮点 && <Text><b>成长亮点</b>：{truncate(p.成长亮点, maxLen)}</Text>}
        </> : <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.爱好与特长 && <Text><b>爱好</b>：{truncate(p.爱好与特长, maxLen)}</Text>}
          {p?.生活日常 && <Text><b>日常</b>：{truncate(p.生活日常, maxLen)}</Text>}
        </>}
      </VStack>
    </CardBody>
    <CardFooter>
      <Button>更多信息</Button>

      {type == "TransactionalMentor" && <>
        <Spacer />
        <Button variant="brand" onClick={ev => {
          ev.stopPropagation();
          openModal();
        }}>预约</Button>
      </>}
    </CardFooter>
  </UserCard>;
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

function UserCardForMobile({ user, profile: p, type, openModal }: {
  user: MinUser,
  profile: UserProfile | null,
  type: UserCardType,
  openModal: () => void,
}) {
  // Roughly five lines of text on iPhone 12 Pro.
  const maxLen = 75;

  return <UserCard
    user={user}
    size="sm"
    variant="unstyled"
    boxShadow="sm"
    type={type}
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
          {p?.职业经历 && <Text>{truncate(p.职业经历, maxLen)}</Text>}
        </> : type == "RelationalMentor" ? <>
          {p?.擅长话题 && <Text>擅长聊：{truncate(p.擅长话题, maxLen)}</Text>}
        </> : <>
          {p?.爱好与特长 && <Text><b>爱好</b>：{truncate(p.爱好与特长, maxLen)}</Text>}
          {p?.生活日常 && <Text><b>日常</b>：{truncate(p.生活日常, maxLen)}</Text>}
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

        {type == "TransactionalMentor" && <>
          <Text color="gray.400">|</Text>
          <Link onClick={ev => {
            ev.stopPropagation();
            openModal();
          }}>预约</Link>
        </>}
      </HStack>
    </HStack>
  </UserCard>;
}
