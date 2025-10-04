import {
  Table,
  Th,
  Tr,
  Td,
  TableContainer,
  Thead,
  Tbody,
  Text,
  Link,
} from "@chakra-ui/react";
import Loader from "components/Loader";
import { formatUserName, notSetText } from "shared/strings";
import { trpcNext } from "trpc";
import { sectionSpacing } from "theme/metrics";
import NextLink from "next/link";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { widePage } from "AppPage";
import {
  formatMentorshipSchedule,
  Mentorship,
  MentorshipSchedule,
} from "shared/Mentorship";
import { getUserUrl } from "shared/User";
import invariant from "shared/invariant";
import _ from "lodash";

const meetingDurationInMins = 60;
const bucketSizeInMins = 15;
const bucketsPerMeeting = meetingDurationInMins / bucketSizeInMins;
invariant(meetingDurationInMins % bucketSizeInMins === 0, "bucket size");

export default widePage(() => {
  const { data } =
    trpcNext.mentorships.listOngoingRelationalMentorships.useQuery();
  const h = computeHistogram(data ?? []);
  const sorted = data?.sort((a, b) => {
    // Put mentorships without schedule at the end
    const sa = a.schedule;
    const sb = b.schedule;
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;

    // Sort by max concurrent meetings
    const aMax = Math.max(...buckets(sa).map((b) => h.get(b) ?? 0));
    const bMax = Math.max(...buckets(sb).map((b) => h.get(b) ?? 0));
    if (aMax !== bMax) return bMax - aMax;

    // Sort by start time
    return buckets(sa)[0] - buckets(sb)[0];
  });

  const max = Math.max(...h.values());

  return !sorted ? (
    <Loader />
  ) : (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>学生</Th>
            <Th>导师</Th>
            <Th>通话时间（北京时区）</Th>
            {_.range(bucketsPerMeeting).map((i) => (
              <Th key={i}>
                {i * bucketSizeInMins}-{(i + 1) * bucketSizeInMins} 分钟
                <br />
                并发数量
              </Th>
            ))}
          </Tr>
        </Thead>

        <Tbody>
          {sorted.map((m) => (
            <Row key={m.id} mentorship={m} h={h} max={max} />
          ))}
        </Tbody>
      </Table>

      <Text fontSize="sm" color="gray" marginTop={sectionSpacing}>
        共 <b>{sorted.length}</b> 个一对一匹配
      </Text>
    </TableContainer>
  );
}, "一对一通话时间");

function buckets(s: MentorshipSchedule): number[] {
  const start = s.week * 7 * 24 * 60 + s.day * 24 * 60 + s.hour * 60 + s.minute;
  return _.range(bucketsPerMeeting).map((i) => start + i * bucketSizeInMins);
}

/**
 * A map from the start time of a bucket to the number of concurrent meetings
 * in the bucket. The start time is the number of minutes since the start of the
 * month. Bucket duration is `bucketSizeInMins`.
 */
type Histogram = Map<number, number>;

function computeHistogram(mentorships: Mentorship[]): Histogram {
  const h = new Map<number, number>();
  for (const { schedule: s } of mentorships) {
    if (!s) continue;
    for (const b of buckets(s)) {
      h.set(b, (h.get(b) ?? 0) + 1);
    }
  }
  return h;
}

function Row({
  mentorship: m,
  h,
  max,
}: {
  mentorship: Mentorship;
  h: Histogram;
  max: number;
}) {
  const s = m.schedule;

  return (
    <Tr _hover={{ bg: "white" }}>
      {/* 学生 */}
      <Td>
        <Link as={NextLink} href={`/mentees/${m.mentee.id}`}>
          <b>{formatUserName(m.mentee.name)}</b> <ChevronRightIcon />
        </Link>
      </Td>

      {/* 导师 */}
      <Td>
        <Link as={NextLink} href={getUserUrl(m.mentor)}>
          <b>{formatUserName(m.mentor.name)}</b> <ChevronRightIcon />
        </Link>
      </Td>

      {/* 通话时间 */}
      <Td>
        <Link as={NextLink} href={`/mentees/${m.mentee.id}`}>
          {s ? formatMentorshipSchedule(s) : notSetText}
        </Link>
      </Td>

      {s &&
        _.range(bucketsPerMeeting).map((i) => {
          const count = h.get(buckets(s)[i]);
          return (
            <Td key={i}>
              {count === max ? (
                <Text fontWeight="bold" color="red">
                  {count}
                </Text>
              ) : (
                count
              )}
            </Td>
          );
        })}
    </Tr>
  );
}
