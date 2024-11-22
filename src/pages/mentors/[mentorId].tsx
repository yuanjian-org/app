import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import { formatUserName, parseQueryString, parseQueryStringOrUnknown } from 'shared/strings';
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
  VStack,
  Button,
} from '@chakra-ui/react';
import { UserProfile } from "shared/UserProfile";
import { sectionSpacing } from "theme/metrics";
import MarkdownStyler from "components/MarkdownStyler";
import MentorBookingModal from "components/MentorBookingModal";
import { useState } from "react";

/**
 * The mentorId query parameter can be a user id or "me". The latter is to
 * allow a convenient URL to manage users' own mentor profiles.
 */
export default function Page() {
  const router = useRouter();
  const userId = parseQueryStringOrUnknown(router, 'mentorId');
  const showBookingButton = !parseQueryString(router, 'nobooking');
  
  const { data } = trpcNext.mentorships.getMentor.useQuery({ userId });
  const [booking, setBooking] = useState<boolean>();

  return !data ? <Loader /> : <>
    <PageBreadcrumb current={formatUserName(data.user.name, "formal")} />

    <Wrap>
      <WrapItem>
        <VStack spacing={sectionSpacing} align="start">
          {data?.profile?.照片链接 && 
            <Image
              maxW='300px'
              src={data.profile.照片链接}
              alt="照片"
              mb={sectionSpacing}
              me={sectionSpacing}
            />
          }

          {showBookingButton &&  <Button
            variant="brand"
            onClick={() => setBooking(true)}
          >预约交流</Button>}
        </VStack>
      </WrapItem>
      <WrapItem>
          {data?.profile && <ProfileTable profile={data.profile} />}
      </WrapItem>
    </Wrap>

    {booking && <MentorBookingModal 
        mentor={data.user}
        onClose={() => setBooking(false)}
      />}
  </>;
}

Page.title = "导师";

function ProfileTable({ profile: p }: {
  profile: UserProfile
}) {
  type KeyLabel = {
    k: keyof UserProfile,
    l?: string,
  };

  const kls: KeyLabel[] = [
    // 置顶亮点
    { k: "身份头衔", l: "职位" },
    { k: "现居住地" },
    { k: "擅长话题", l: "擅长聊天话题" },
    { k: "成长亮点" },

    { k: "个性特点" },
    { k: "爱好与特长" },
    { k: "喜爱读物", l: "喜爱的书和媒体" },
    { k: "职业经历" },
    { k: "教育经历" },
    { k: "曾居住地" },
    { k: "生活日常" },
  ];

  return <TableContainer maxW="700px"><Table>
    {kls.map((kl, idx) => 
      <ProfileRow key={idx} profile={p} k={kl.k} label={kl.l} />)
    }
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
