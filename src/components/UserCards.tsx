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
  TextProps, BoxProps,
  GridItem,
  useBreakpointValue,
  InputGroupProps,
  GridProps
} from '@chakra-ui/react';
import { formatUserName, toPinyin } from 'shared/strings';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import { MinUser } from 'shared/User';
import { UserProfile, StringUserProfile } from 'shared/UserProfile';
import { CardHeader, CardBody, CardFooter } from '@chakra-ui/react';
import { useMemo, useState, useRef, useEffect, PropsWithChildren, useCallback } from 'react';
import MentorBookingModal from 'components/MentorBookingModal';
import { CheckIcon, SearchIcon } from '@chakra-ui/icons';
import { KudosControl, KudosHistory, markKudosAsRead, UnreadKudosRedDot, useUnreadKudos } from './Kudos';
import { CardForDesktop, CardForMobile } from './ResponsiveCard';
import { trpcNext } from 'trpc';
import Loader from './Loader';
import { UserDisplayData } from 'components/UserPanel';
import UserDrawer from './UserDrawer';
import { MentorSelection } from 'shared/MentorSelection';
import useMobile from 'useMobile';
import LinkDivider from './LinkDivider';
import { redDotTransitionProps } from './RedDot';
import { cmdOrCtrlChar, isBrowserOnMac } from 'macOrWin';

export type FieldAndLabel = {
  field: keyof StringUserProfile;
  label?: string;
};

/**
 * UI displays these fields in the order of this array.
 */
export const visibleUserProfileFields: FieldAndLabel[] = [
  { field: "英文别名", label: "昵称或英文名" },
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

export function FullTextSearchBox({ 
  value, setValue, narrow, ...inputGroupProps
}: {
  value: string,
  setValue: (value: string) => void,
  narrow?: boolean,
} & InputGroupProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hotKey = useBreakpointValue({
    base: "", 
    md: cmdOrCtrlChar() + "+F "
  });

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((isBrowserOnMac() ? event.metaKey : event.ctrlKey) &&
        event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [searchInputRef]);  

  return <InputGroup maxW={narrow ? "300px" : undefined} {...inputGroupProps}>
    <InputLeftElement><SearchIcon color="gray" /></InputLeftElement>
    <Input
      ref={searchInputRef}
      bg="white"
      type="search"
      autoFocus
      placeholder={`${hotKey}搜索关键字，支持拼音`}
      value={value}
      onChange={ev => setValue(ev.target.value)}
    />
  </InputGroup>;
}

/**
 * @param searchTerm Empty string means no search.
 */
export default function UserCards({
  type, users, searchTerm, mentorSelections, ...gridProps 
}: {
  type: UserCardType,
  users: UserDisplayData[],
  searchTerm: string,
  mentorSelections?: MentorSelection[],
} & GridProps) {
  // Set to null to book with any mentor
  const [bookingMentor, setBookingMentor] = useState<MinUser | null>();

  const searchResult = useMemo(() => {
    return searchTerm ? search(users, searchTerm) : users;
  }, [searchTerm, users]); 

  // Show kudos history card only when not searching.
  const showKudosHistory = type == "Volunteer" && !searchTerm;

  const mobile = useMobile();

  return <>
    {!mobile && <SimpleGrid
      spacing={componentSpacing}
      templateColumns='repeat(auto-fill, minmax(270px, 1fr))'
      {...gridProps}
    >
      {showKudosHistory && <GridItem colSpan={2} rowSpan={1}>
        <KudosHistoryCard type="desktop" />
      </GridItem>}

      {searchResult.map(d => <UserCardForDesktop
        key={d.user.id}
        data={d}
        type={type}
        openModal={() => setBookingMentor(d.user)}
        recommended={isMentorRecommended(d.traitsMatchingScore)}
        selected={mentorSelections?.some(ms => ms.mentor.id == d.user.id)}
      />)}
    </SimpleGrid>}

    {mobile && <SimpleGrid
      spacing={componentSpacing}
      templateColumns='1fr'
      alignItems="stretch"
      {...gridProps}
    >
      {showKudosHistory && <KudosHistoryCard type="mobile" />}

      {searchResult.map(d => <UserCardForMobile
        key={d.user.id}
        data={d}
        type={type}
        openModal={() => setBookingMentor(d.user)}
        recommended={isMentorRecommended(d.traitsMatchingScore)}
        selected={mentorSelections?.some(ms => ms.mentor.id == d.user.id)}
      />)}
    </SimpleGrid>}
        
    {bookingMentor !== undefined &&
      <MentorBookingModal
        mentor={bookingMentor} 
        onClose={() => setBookingMentor(undefined)}
      />
    }
  </>;
}

function KudosHistoryCard({ type }: { type: "desktop" | "mobile" }) {
  const limit = 50;
  const { data: kudos } = trpcNext.kudos.list.useQuery({
    userId: undefined,
    limit,
  });
  const hasUnread = useUnreadKudos();

  const utils = trpcNext.useContext();
  const [marked, setMarked] = useState(false);
  const markAsRead = useCallback(async () => {
    // Avoid frequent calls.
    if (marked) return;
    // Note that `last` covers all the kudos given by the current user.
    const last = kudos?.[0]?.createdAt;
    if (last) {
      await markKudosAsRead(utils, last);
      setMarked(true);
    }
  }, [marked, kudos, utils]);

  const MyCard = useCallback(({ children }: PropsWithChildren) =>
    type == "desktop" ?
      <CardForDesktop height="100%">{children}</CardForDesktop> :
      <CardForMobile>{children}</CardForMobile>, [type]);

  return <MyCard>
    <CardBody onClick={markAsRead}>
      <Flex
        direction="column"
        gap={type == "desktop" ? componentSpacing * 2 : componentSpacing}
      >
        <Flex justify="space-between">
          <Heading size={type == "desktop" ? "md" : "sm"} position="relative">
            最近的赞
            <UnreadKudosRedDot />
          </Heading>

          <HStack spacing={2} fontSize="sm">
            <Link onClick={markAsRead} {...redDotTransitionProps(hasUnread)}>
              全部已读
            </Link>
          </HStack>
        </Flex>

        <Box
          // Force scrolling by setting maxH. Its value is empirically set.
          maxH={type == "desktop" ? "600px" : "220px"}
          overflowY="auto"
          onScroll={markAsRead}
          // On mobile, the scroll event is not triggered by touch or drag.
          onTouchMove={markAsRead}
          onDragEnd={markAsRead}
        >
          {!kudos ? <Loader /> : <KudosHistory
            kudos={kudos}
            type={type}
            showReceiver
            showPseudoRows
            showLimit={limit}
          />}
        </Box>
      </Flex>
    </CardBody>
  </MyCard>;
}

function isMentorRecommended(traitsMatchingScore?: number) {
  return traitsMatchingScore !== undefined && traitsMatchingScore > 0;
}

function search(users: UserDisplayData[], searchTerm: string) {
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

function UserCardForDesktop({
  data, type, openModal, recommended, selected
}: {
  data: UserDisplayData,
  type: UserCardType,
  openModal: () => void,
  recommended: boolean,
  selected?: boolean,
}) {
  const p = data.profile;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const visitUser = () => setIsDrawerOpen(true);

  return <CardForDesktop {...(selected ? { bg: "green.50" } : {})}>

    <FullWidthImageSquare profile={p} onClick={visitUser} cursor="pointer" />

    <CardHeader onClick={visitUser} cursor="pointer">
      <Heading size='md'>
        {formatUserName(data.user.name, "formal")}
        {recommended && <MentorStar ms={3} />}
      </Heading>
    </CardHeader>
    <CardBody pt={1} onClick={visitUser} cursor="pointer">
      <Flex direction="column" gap={paragraphSpacing}>
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}
        {type == "TransactionalMentor" ? <>
          {p?.专业领域 && <Text><b>专业</b>：{p.专业领域}</Text>}
          {p?.职业经历 && <TruncatedText>{p.职业经历}</TruncatedText>}
        </> : type == "RelationalMentor" ? <>
          {p?.现居住地 && <Text>坐标：{p.现居住地}</Text>}
          {p?.擅长话题 && <TruncatedText>擅长聊：{p.擅长话题}</TruncatedText>}
          {p?.成长亮点 && <TruncatedText>成长亮点：{p.成长亮点}</TruncatedText>}
        </> : <>
          {p?.现居住地 && <Text><b>坐标</b>：{p.现居住地}</Text>}
          {p?.爱好与特长 && <TruncatedText>{p.爱好与特长}</TruncatedText>}
          {p?.生活日常 && <TruncatedText>{p.生活日常}</TruncatedText>}
        </>}
      </Flex>
    </CardBody>

    <CardFooter alignItems="center">
      <Button onClick={visitUser}>
        查看详情
      </Button>

      <Spacer />

      {selected && <Text color="green.600"><CheckIcon mr={1} /><b>已选择</b></Text>}

      {type == "TransactionalMentor" && <>
        <Button variant="brand" onClick={ev => {
          ev.stopPropagation();
          openModal();
        }}>预约交流</Button>
      </>}

      {type == "Volunteer" && <KudosControl
        user={data.user}
        likes={data.likes ?? 0}
        kudos={data.kudos ?? 0}
      />}

    </CardFooter>

    {isDrawerOpen && <UserDrawer
      data={{ ...data, isMentor: type != "Volunteer" }}
      showBookingButton={type == "TransactionalMentor"}
      showMatchingTraitsAndSelection={type == "RelationalMentor"}
      onClose={() => setIsDrawerOpen(false)}
    />}
  </CardForDesktop>;
}

function TruncatedText({ children, noOfLines = 5 }: {
  noOfLines?: number,
} & PropsWithChildren) {
  return <Text noOfLines={noOfLines}>{children}</Text>;
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
  data, type, openModal, recommended, selected
}: {
  data: UserDisplayData,
  type: UserCardType,
  openModal: () => void,
  recommended: boolean,
  selected?: boolean,
}) {
  const p = data.profile;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const visitUser = () => setIsDrawerOpen(true);

  return <CardForMobile {...(selected ? { bg: "green.50" } : {})}>
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
        onClick={visitUser}
      >
        <Box width="100px">
          <FullWidthImageSquare profile={p} />
        </Box>

        <VStack
          ml={componentSpacing}
          // Align content to the left
          align="start"
        >
          <Heading size='sm'>
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
        onClick={visitUser}
      >
        {p?.身份头衔 && <Text><b>{p.身份头衔}</b></Text>}

        {type == "TransactionalMentor" ? <>
          {p?.职业经历 && <TruncatedText>{p.职业经历}</TruncatedText>}
        </> : type == "RelationalMentor" ? <>
          {p?.擅长话题 && <TruncatedText noOfLines={3}>擅长聊：{p.擅长话题}</TruncatedText>}
          {p?.成长亮点 && <TruncatedText noOfLines={3}>成长亮点：{p.成长亮点}</TruncatedText>}
        </> : <>
          {p?.爱好与特长 && <TruncatedText noOfLines={3}>爱好：{p.爱好与特长}</TruncatedText>}
          {p?.生活日常 && <TruncatedText noOfLines={3}>日常：{p.生活日常}</TruncatedText>}
        </>}
      </VStack>

      {/* Position it to the bottom right corner of the card */}
      <HStack
        spacing={2}
        position="absolute"
        bottom={componentSpacing}
        right={componentSpacing}
      >
        {recommended && <MentorStar me={2} />}

        {selected && <>
          <Text color="green.600"><CheckIcon mr={1} />已选择</Text>
          <LinkDivider />
        </>}

        <Link onClick={visitUser}>
          查看详情
        </Link>

        {type == "TransactionalMentor" && <>
          <LinkDivider />
          <Link onClick={ev => {
            ev.stopPropagation();
            openModal();
          }}>预约交流</Link>
        </>}

        {type == "Volunteer" && <>
          <LinkDivider />
          <KudosControl
            user={data.user}
            likes={data.likes ?? 0}
            kudos={data.kudos ?? 0}
          />
        </>}

      </HStack>
    </HStack>

    {isDrawerOpen && <UserDrawer
      data={{ ...data, isMentor: type != "Volunteer" }}
      showBookingButton={type == "TransactionalMentor"}
      showMatchingTraitsAndSelection={type == "RelationalMentor"}
      onClose={() => setIsDrawerOpen(false)}
    />}

  </CardForMobile>;
}

export function MentorStar(props: TextProps) {
  return <Tooltip label="该导师的匹配偏好与你的个人特质契合度较高。推荐仅供参考，选择权在你。">
    <Text display="inline" color="orange.600" {...props}>⭐</Text>
  </Tooltip>;
}
