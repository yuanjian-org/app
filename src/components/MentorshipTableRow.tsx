import { Td } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { PartnershipWithGroupAndNotes } from 'shared/Partnership';
import { formatUserName, prettifyDate, toPinyin } from 'shared/strings';
import TrLink from 'components/TrLink';
import moment from 'moment';
import { MinUser } from 'shared/User';
import trpc from 'trpc';

export function MentorshipTableRow({ mentorship: m, showCoach, showPinyin, edit }: {
  mentorship: PartnershipWithGroupAndNotes;
  showCoach?: boolean,
  showPinyin?: boolean,
  edit?: (m: PartnershipWithGroupAndNotes) => void,
}) {
  const [coach, setCoach] = useState<MinUser | null>(null);

  useEffect(() => {
    if (!showCoach) return;
    const fetch = async () => setCoach(await trpc.users.getCoach.query({ userId: m.mentor.id }));
    fetch();
  }, [m, showCoach]);

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

  return <TrLink href={`/partnerships/${m.id}`} {...edit && { onClick: () => edit(m) }}>
    <Td>{formatUserName(m.mentee.name, "formal")}</Td>
    <Td>{formatUserName(m.mentor.name, "formal")}</Td>
    {showCoach && <Td>{coach && formatUserName(coach.name, "formal")}</Td>}
    {showPinyin && <Td>
      {toPinyin(m.mentee.name ?? "")},{toPinyin(m.mentor.name ?? "")}
      {coach && "," + toPinyin(coach.name ?? "")}
    </Td>}
    <Td color={color}>{msg}</Td>
  </TrLink>;
}
