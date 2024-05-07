import React from 'react';
import { Select } from '@chakra-ui/react';
import _ from "lodash";
import { AllMenteeStatuses, MenteeStatus, zMenteeStatus } from 'shared/MenteeStatus';

export const NULL_MENTEE_STATUS = "待审";
export const ANY_MENTEE_STATUS = "所有";

export default function MenteeStatusSelect({
  value: status, showAny, size, onChange 
}: {
  value: MenteeStatus | null | undefined,
  showAny?: boolean,
  size?: string,
  onChange: (v: MenteeStatus | null | undefined) => void
}) {
  return <Select size={size}
  
    value={status === undefined ? ANY_MENTEE_STATUS : status === null ? 
      NULL_MENTEE_STATUS : status}

    onChange={e => {
      const v = e.target.value;
      if (v == NULL_MENTEE_STATUS) onChange(null);
      else if (v == ANY_MENTEE_STATUS) onChange(undefined);
      else onChange(zMenteeStatus.parse(v));
    }
  }>
    {showAny && <option value={ANY_MENTEE_STATUS}>{ANY_MENTEE_STATUS}</option>}
    <option value={NULL_MENTEE_STATUS}>{NULL_MENTEE_STATUS}</option>
    {AllMenteeStatuses.map(status =>
      <option key={status} value={status}>{status}</option>
    )}
  </Select>;
}
