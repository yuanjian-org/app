import trpc, { trpcNext } from "../trpc";
import Loader from 'components/Loader';
import {
  formatUserName
} from 'shared/strings';
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
  Wrap, Textarea,
  FormControl,
  FormErrorMessage,
  SimpleGrid
} from '@chakra-ui/react';
import {
  MinUserAndProfile,
  UserProfile,
  StringUserProfile,
} from "shared/UserProfile";
import {
  breakpoint,
  componentSpacing,
  sectionSpacing,
} from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import MentorBookingModal from "components/MentorBookingModal";
import { useEffect, useMemo, useState } from "react";
import { getUserUrl, MinUser } from "shared/User";
import { visibleUserProfileFields } from "components/UserCards";
import { isPermitted } from "shared/Role";
import NextLink from "next/link";
import { CopyIcon, EditIcon } from "@chakra-ui/icons";
import { toast } from "react-toastify";
import {
  computeTraitsMatchingScore,
  TraitsPreference,
} from "shared/Traits";
import {
  TraitsModal,
  traitsPrefLabel2value,
  traitsPrefProfiles,
  TraitTag,
} from "components/Traits";
import invariant from "tiny-invariant";
import useMe, { useMyId, useMyRoles } from "useMe";
import { KudosControl } from "./Kudos";

export type UserDisplayData = MinUserAndProfile & {
  // The presence of these fields depends on call sites and context
  traitsMatchingScore?: number;
  likes?: number;
  kudos?: number;
};

export type UserPanelProps = {
  data: UserDisplayData & { isMentor: boolean },
  showBookingButton?: boolean,
  showMatchingTraitsAndSelection?: boolean,
  hideKudosControl?: boolean,
};

export default function UserPanel({ 
  data, showBookingButton, showMatchingTraitsAndSelection, hideKudosControl
}: UserPanelProps) {
  const myRoles = useMyRoles();

  return <>
    <PageBreadcrumb current={
      (data.isMentor ? "导师：" : "") + formatUserName(data.user.name, "formal")}
    />

    <Stack
      spacing={sectionSpacing}
      direction={{ base: "column", [breakpoint]: "row" }}
    >
      <VStack spacing={sectionSpacing}>
        <VStack spacing={componentSpacing}>
          {data.profile?.照片链接 &&
            <Image
              maxW='300px'
              src={data.profile.照片链接}
              alt="照片"
            />
          }
          <UserUrl u={data.user} />
        </VStack>

        {showMatchingTraitsAndSelection && <>
          <MatchingTraits userId={data.user.id} />
          <Selection mentorId={data.user.id} />
        </>}

        {showBookingButton && <BookingButtonAndModal user={data.user} />}

        {!hideKudosControl && isPermitted(myRoles, "Volunteer") && (
          <HStack mt={sectionSpacing}>
            <KudosControl
              user={data.user}
              likes={data.likes ?? 0}
              kudos={data.kudos ?? 0}
            />
          </HStack>
        )}

      </VStack>

      {data.profile && <ProfileTable
        user={data.user}
        profile={data.profile}
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
  const myId = useMyId();

  const { data: traitsPref } = 
    trpcNext.users.getMentorTraitsPref.useQuery({ userId });
  const { data: user, refetch } = 
    trpcNext.users.getUserProfile.useQuery({ userId: myId });
  const { data: applicant } = 
    trpcNext.users.getApplicant.useQuery({
      type: "MenteeInterview",
      userId: myId,
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
    <VStack spacing={componentSpacing}>
      <Text fontSize="sm" textAlign="center">
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
    </VStack>

    {isModalOpen && <TraitsModal onClose={() => {
      setIsModalOpen(false);
      void refetch();
    }} />}
  </>;
}

function Selection({ mentorId }: {
  mentorId: string,
}) {
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);
  const utils = trpcNext.useContext();

  const { data } = trpcNext.mentorSelections.getDraft.useQuery({ mentorId });

  useEffect(() => {
    // `old ?? ...` so that existing data doesn't get overridden
    if (data !== undefined) setReason(old => old || (data?.reason ?? ""));
  }, [data]);

  const selected = data !== null;
  const busy = saving || data === undefined;

  const invalidate = async () => {
    await utils.mentorSelections.listDrafts.invalidate();
    await utils.mentorSelections.getDraft.invalidate({ mentorId });
  };

  const select = async () => {
    setShowError(reason.length === 0);
    if (reason.length === 0) return;
    setSaving(true);
    try {
      await trpc.mentorSelections.createDraft.mutate({ mentorId, reason });
      await invalidate();
      toast.success("选择成功。");
    } finally {
      setSaving(false);
    }
  };

  const unselect = async () => {
    setSaving(true);
    try {
      await trpc.mentorSelections.destroyDraft.mutate({ mentorId });
      await invalidate();
      toast.success("选择已取消。");
    } finally {
      setSaving(false);
    }
  };

  const update = async () => {
    setSaving(true);
    try {
      await trpc.mentorSelections.updateDraft.mutate({ mentorId, reason });
      await invalidate();
      toast.success("更新成功。");
    } finally {
      setSaving(false);
    }
  };

  return <VStack spacing={componentSpacing} w="full">
    <FormControl isInvalid={showError}>
      <Textarea
        height="140px"
        bg="white"
        value={reason} 
        onChange={ev => setReason(ev.target.value)}
        isDisabled={busy}
        placeholder="选择这位导师的原因"
        autoFocus
      />
      {showError && <FormErrorMessage>请首先填写选择原因。</FormErrorMessage>}
    </FormControl>

    {selected && <SimpleGrid columns={2} spacing={componentSpacing} w="full">
      <Button
        onClick={unselect}
        isLoading={busy}
      >取消选择</Button>
      <Button
        variant="brand"
        onClick={update}
        isLoading={busy}
      >更新选择原因</Button>
    </SimpleGrid>}

    {!selected && <Button
      width="full" 
      variant={"brand"}
      onClick={select}
      isLoading={busy}
    >选择这位导师</Button>}

  </VStack>;
}

function BookingButtonAndModal({ user }: {
  user: MinUser,
}) {
  const [booking, setBooking] = useState<boolean>();
  return <>
    <Button
      width="full" 
      variant="brand"
      onClick={() => setBooking(true)}
    >预约交流</Button>

    {booking && <MentorBookingModal 
      mentor={user}
      onClose={() => setBooking(false)}
    />}
  </>;
}

function ProfileTable({ user, profile: p }: {
  user: MinUser,
  profile: UserProfile,
}) {
  const me = useMe();

  return <TableContainer maxW="700px"><Table variant="unstyled">
    <Tbody>
      {visibleUserProfileFields.map((fl, idx) => 
        <ProfileRow key={idx} profile={p} k={fl.field} label={fl.label} />)
      }

      {(me.id == user.id || isPermitted(me.roles, "UserManager")) &&
        <Tr><Td></Td><Td><Link
          as={NextLink}
          href={`/profiles/${user.id}`}
        ><EditIcon /> 修改资料</Link></Td></Tr>
      }
    </Tbody>
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
