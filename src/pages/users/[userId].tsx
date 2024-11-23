import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import {
  formatUserName, parseQueryString, parseQueryStringOrUnknown
} from 'shared/strings';
import { useRouter } from 'next/router';
import PageBreadcrumb from 'components/PageBreadcrumb';
import {
  Image,
  Wrap,
  WrapItem,
  Table,
  Tr,
  Td,
  TableContainer,
  Button,
  Tbody,
} from '@chakra-ui/react';
import { UserProfile } from "shared/UserProfile";
import { sectionSpacing } from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import MentorBookingModal from "components/MentorBookingModal";
import { useState } from "react";
import { MinUser } from "shared/User";
import { visibleUserProfileFields } from "components/UserCards";

/**
 * The mentorId query parameter can be a user id or "me". The latter is to
 * allow a convenient URL to manage users' own mentor profiles.
 */
export default function Page() {
  const router = useRouter();
  const userId = parseQueryStringOrUnknown(router, 'userId');
  const showBookingButton = !!parseQueryString(router, 'booking');
  
  const { data } = trpcNext.users.getUserProfile.useQuery({ userId });

  return !data ? <Loader /> : <>
    <PageBreadcrumb current={formatUserName(data.user.name, "formal")} />

    <Wrap spacing={sectionSpacing}>
      <WrapItem alignContent="center">
        {data?.profile?.照片链接 && 
          <Image
            maxW='300px'
            src={data.profile.照片链接}
            alt="照片"
          />
        }
      </WrapItem>
      <WrapItem>
          {data?.profile && <ProfileTable
            user={data.user}
            profile={data.profile}
            showBookingButton={showBookingButton}
          />}
      </WrapItem>
    </Wrap>
  </>;
}

Page.title = "导师";

function ProfileTable({ user, profile: p, showBookingButton }: {
  user: MinUser,
  profile: UserProfile,
  showBookingButton: boolean,
}) {
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
