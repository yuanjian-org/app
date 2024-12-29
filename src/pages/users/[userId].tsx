import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import {
  formatUserName, parseQueryString
} from 'shared/strings';
import { useRouter } from 'next/router';
import PageBreadcrumb from 'components/PageBreadcrumb';
import {
  Image,
  Text,
  Table,
  Tr,
  Td,
  TableContainer,
  Button,
  Tbody,
  Link,
  Stack,
  VStack,
  HStack,
  useClipboard,
  Wrap,
} from '@chakra-ui/react';
import { MinUserAndProfile, UserProfile, StringUserProfile } from "shared/UserProfile";
import { breakpoint, componentSpacing, sectionSpacing } from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import MentorBookingModal from "components/MentorBookingModal";
import { useEffect, useMemo, useState } from "react";
import { getUserUrl, MinUser } from "shared/User";
import { visibleUserProfileFields } from "components/UserCards";
import { useUserContext } from "UserContext";
import { isPermitted } from "shared/Role";
import NextLink from "next/link";
import { CopyIcon, EditIcon } from "@chakra-ui/icons";
import { toast } from "react-toastify";
import { computeTraitsMatchingScore, TraitsPreference } from "shared/Traits";
import { TraitsModal, traitsPrefLabel2value, traitsPrefProfiles, TraitTag } from "components/Traits";
import invariant from "tiny-invariant";
import { KudosControl } from "components/Kudos";

export type UserDisplayData = MinUserAndProfile & {
  // The presence of these fields depends on call sites and context
  traitsMatchingScore?: number;
  likes?: number;
  kudos?: number;
};

export default function Page() {
  const userId = parseQueryString(useRouter(), 'userId');

  const { data } = userId ?
    trpcNext.users.getUserProfile.useQuery({ userId }) : { data: undefined };
  return data ? <UserPage data={data} /> : <Loader />;
}
Page.title = "用户资料";

export function UserPage({ data }: {
  data: UserDisplayData & { isMentor: boolean } | undefined
}) {
  const [me] = useUserContext();
  const showBookingButton = parseQueryString(useRouter(), 'booking') !== "0" &&
    !!data?.isMentor;
  const showMatchingTraits = parseQueryString(useRouter(), 'traits') === "1" &&
    !!data?.isMentor;

  return !data ? <Loader /> : <>
    <PageBreadcrumb current={
      (data.isMentor ? "导师：" : "") + formatUserName(data.user.name, "formal")}
    />

    <Stack
      spacing={sectionSpacing}
      direction={{ base: "column", [breakpoint]: "row" }}
    >
      <VStack>
        {data.profile?.照片链接 &&
          <Image
            maxW='300px'
            src={data.profile.照片链接}
            alt="照片"
          />
        }
        <UserUrl u={data.user} />

        {isPermitted(me.roles, "Volunteer") && <HStack mt={sectionSpacing}>
          <KudosControl
            user={data.user}
            likes={data.likes ?? 0}
            kudos={data.kudos ?? 0}
          />
        </HStack>}

        {showMatchingTraits && <MatchingTraits userId={data.user.id} />}
      </VStack>

      {data.profile && <ProfileTable
        user={data.user}
        profile={data.profile}
        showBookingButton={showBookingButton}
      />}
    </Stack>
  </>;
}

function UserUrl({ u }: {
  u: MinUser
}) {
  const url = window.location.host + getUserUrl(u);
  const { onCopy, hasCopied } = useClipboard(url);

  useEffect(() => {
    if (hasCopied) toast.success("链接已经拷贝到剪贴板。");
  }, [hasCopied]);

  return u.url ? <HStack
    onClick={onCopy}
    cursor="pointer"
    textColor="gray"
    fontSize="sm"
  >
    <Text>{url}</Text>
    <CopyIcon />
  </HStack>
  :
  <></>;
}

function MatchingTraits({ userId }: {
  userId: string,
}) {
  const [me] = useUserContext();

  const { data: traitsPref } = 
    trpcNext.users.getMentorTraitsPref.useQuery({ userId });
  const { data: user, refetch } = 
    trpcNext.users.getUserProfile.useQuery({ userId: me.id });
  const { data: applicant } = 
    trpcNext.users.getApplicant.useQuery({
      type: "MenteeInterview",
      userId: me.id,
    });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const matchingTraits = useMemo(() => {
    if (user === undefined || applicant === undefined ||
      traitsPref === undefined) return undefined;
    const { matchingTraits } = computeTraitsMatchingScore(
      user.profile,
      applicant.application,
      traitsPref,
    );
    return matchingTraits;
  }, [user, applicant, traitsPref]);

  return !matchingTraits ? <Loader /> : matchingTraits.length === 0 ? <></> : <>
    <Text mt={sectionSpacing} mb={componentSpacing} fontSize="sm" 
      textAlign="center"
    >
      你的以下这些
      <Link onClick={() => setIsModalOpen(true)}>
        个人特质
      </Link>
      符合导师的匹配偏好
      <br />
      （仅供参考，导师的选择权在你）
    </Text>
    <Wrap>
      {matchingTraits.map(t => {
        const profile = traitsPrefProfiles.find(p => p.field === t);
        if (!profile) return <></>;

        invariant(traitsPref);
        invariant(traitsPrefLabel2value[0] < 0);
        invariant(traitsPrefLabel2value[1] > 0);

        const label = traitsPref[t as keyof TraitsPreference] as number < 0 ?
          profile.labels[0] : profile.labels[1];
        return <TraitTag key={t} label={label} selected />;
      })}
    </Wrap>

    {isModalOpen && <TraitsModal onClose={() => {
      setIsModalOpen(false);
      void refetch();
    }} />}
  </>;
}

function ProfileTable({ user, profile: p, showBookingButton }: {
  user: MinUser,
  profile: UserProfile,
  showBookingButton: boolean,
}) {
  const [me] = useUserContext();
  const [booking, setBooking] = useState<boolean>();

  return <TableContainer maxW="700px"><Table>
    <Tbody>
      {visibleUserProfileFields.map((fl, idx) => 
        <ProfileRow key={idx} profile={p} k={fl.field} label={fl.label} />)
      }

      {showBookingButton && <Tr><Td></Td><Td><Button
        variant="brand"
        onClick={() => setBooking(true)}
      >预约交流</Button></Td></Tr>}

      {(me.id == user.id || isPermitted(me.roles, "UserManager")) &&
        <Tr><Td></Td><Td><Link
          as={NextLink}
          href={`/profiles/${user.id}`}
        ><EditIcon /> 修改资料</Link></Td></Tr>
      }
    </Tbody>

    {booking && <MentorBookingModal 
      mentor={user}
      onClose={() => setBooking(false)}
    />}

  </Table></TableContainer>;
}

function ProfileRow({ profile: p, k, label }: {
  profile: UserProfile,
  k: keyof StringUserProfile,
  label?: string,
}) {
  return !p[k] ? <></> : <Tr>
    <Td
      verticalAlign="top"
      py={0.5}
      px={0}
      textAlign="end"

      // To force wrap long labels
      minW="80px"
      whiteSpace="normal"
    >
      {/* Use also sytler in this cell for text's vertical alignment with the
        * other cell */}
      <MarkdownStyler content={`**${label === undefined ? k : label}**`} />
    </Td>
    <Td
      verticalAlign="top"
      py={0.5}
      pe={0}
      // To force wrap long lines
      whiteSpace="normal"
    >
      <MarkdownStyler content={p[k] ?? ""} />
    </Td>
  </Tr>;
}
