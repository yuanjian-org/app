import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import {
  formatUserName, parseQueryString, parseQueryStringOrUnknown
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
} from '@chakra-ui/react';
import { MinUserAndProfile, UserProfile } from "shared/UserProfile";
import { breakpoint, sectionSpacing } from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import MentorBookingModal from "components/MentorBookingModal";
import { useEffect, useState } from "react";
import { getUserUrl, MinUser } from "shared/User";
import { visibleUserProfileFields } from "components/UserCards";
import { useUserContext } from "UserContext";
import { isPermitted } from "shared/Role";
import NextLink from "next/link";
import { CopyIcon, EditIcon } from "@chakra-ui/icons";
import { toast } from "react-toastify";

/**
 * The userId query parameter can be a user id or "me". The latter is to
 * allow a convenient URL to manage users' own mentor profiles.
 */
export default function Page() {
  const userId = parseQueryStringOrUnknown(useRouter(), 'userId');
  const { data } = trpcNext.users.getUserProfile.useQuery({ userId });
  return <UserPage data={data} />;
}
Page.title = "用户资料";

export function UserPage({ data }: {
  data: MinUserAndProfile | undefined
}) {
  const showBookingButton = !!parseQueryString(useRouter(), 'booking');

  return !data ? <Loader /> : <>
    <PageBreadcrumb current={formatUserName(data.user.name, "formal")} />

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
  k: keyof UserProfile,
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
