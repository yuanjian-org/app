import { Td } from '@chakra-ui/react';
import React from 'react';
import { Mentorship } from 'shared/Mentorship';
import { formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import TrLink from 'components/TrLink';
import moment from 'moment';
import { trpcNext } from 'trpc';
import TdLink from './TdLink';
import EditIconButton from './EditIconButton';

export function MentorshipTableRow({ mentorship: m, showCoach, showPinyin, edit }: {
  mentorship: Mentorship;
  showCoach?: boolean,
  showPinyin?: boolean,
  edit?: (m: Mentorship) => void,
}) {
  // Always fetch coach data even if `!showCoach`, otherwise we have to use `useEffect`.
  // The latter wouldn't work well because mentorships.tsx has a call to `utils.users.getCoach.invalidate` which
  // will not trigger `useEffect` to re-run.
  const { data: coach } = trpcNext.users.getMentorCoach.useQuery({ userId: m.mentor.id });

  const { data: transcriptLatest } = trpcNext.transcripts.getMostRecentStartedAt.useQuery({ groupId: m.group.id });
  const transcriptTextAndColor = getDateTextAndColor(transcriptLatest, 45, 60, "尚未通话");

  const { data: messageLatest } = trpcNext.chat.getMostRecentMessageUpdatedAt.useQuery({ mentorshipId: m.id });
  const messageTextAndColor = getDateTextAndColor(messageLatest, 60, 90, "无讨论");

  const href=`/mentorships/${m.id}`;

  return <TrLink>
    {edit && <Td><EditIconButton onClick={() => edit(m)} /></Td>}

    <TdLink href={href}>{formatUserName(m.mentee.name)}</TdLink>
    <TdLink href={href}>{formatUserName(m.mentor.name)}</TdLink>
    {showCoach && <TdLink href={href}>{coach && formatUserName(coach.name)}</TdLink>}

    <TdLink href={href} color={transcriptTextAndColor[1]}>{transcriptTextAndColor[0]}</TdLink>
    <TdLink href={href} color={messageTextAndColor[1]}>{messageTextAndColor[0]}</TdLink>

    {showPinyin && <TdLink href={href}>
      {toPinyin(m.mentee.name ?? "")},{toPinyin(m.mentor.name ?? "")}
      {coach && "," + toPinyin(coach.name ?? "")}
    </TdLink>}
  </TrLink>;
}

/**
 * @param date undefined means it's still being fetched.
 */
function getDateTextAndColor(date: string | null | undefined, yellowThreshold: number, redThreshold: number, 
  nullText: string) 
{
  let text;
  let color;
  if (date) {
    text = prettifyDate(date);
    const daysAgo = moment().diff(date, "days");
    color = daysAgo < 45 ? "green" : daysAgo < 60 ? "yellow.600" : "brown";
  } else if (date === null) {
    text = nullText;
    color = "grey";
  }
  return [text, color];
}