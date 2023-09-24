import { Td } from '@chakra-ui/react';
import React from 'react';
import { PartnershipWithGroupAndNotes } from 'shared/Partnership';
import { formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import TrLink from 'components/TrLink';
import moment from 'moment';
import { trpcNext } from 'trpc';

export function MentorshipTableRow({ mentorship: m, showCoach, showPinyin, edit }: {
  mentorship: PartnershipWithGroupAndNotes;
  showCoach?: boolean,
  showPinyin?: boolean,
  edit?: (m: PartnershipWithGroupAndNotes) => void,
}) {
  // Always fetch coach data even if `!showCoach`, otherwise we have to use `useEffect`.
  // The latter wouldn't work well becuase mentorships.tsx has a call to `utils.users.getCoach.invalidate` which
  // will not trigger `useEffect` to re-run.
  const { data: coach } = trpcNext.users.getCoach.useQuery({ userId: m.mentor.id });

  let msg;
  let color;
  if (m.group.transcripts.length) {
    // return the most recent transcript
    const t = m.group.transcripts.reduce((a, b) => moment(a.startedAt).isBefore(b.startedAt) ? b : a);
    msg = prettifyDate(t.startedAt);
    const daysAgo = moment().diff(t.startedAt, "days");
    color = daysAgo < 45 ? "green" : daysAgo < 60 ? "yellow.600" : "brown";
  } else {
    msg = "尚未通话";
    color = "grey";
  }

  return <TrLink href={`/mentorships/${m.id}`} {...edit && { onClick: () => edit(m) }}>
    <Td>{formatUserName(m.mentee.name)}</Td>
    <Td>{formatUserName(m.mentor.name)}</Td>
    {showCoach && <Td>{coach && formatUserName(coach.name)}</Td>}
    {showPinyin && <Td>
      {toPinyin(m.mentee.name ?? "")},{toPinyin(m.mentor.name ?? "")}
      {coach && "," + toPinyin(coach.name ?? "")}
    </Td>}
    <Td color={color}>{msg}</Td>
  </TrLink>;
}
