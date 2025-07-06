import React from "react";
import { Select, Td, Wrap, WrapItem } from "@chakra-ui/react";
import {
  AllMenteeStatuses,
  MenteeStatus,
  zMenteeStatus,
} from "shared/MenteeStatus";

export const nullMenteeStatus = "待审";
export const anyMenteeStatus = "所有";

const status2color: Record<MenteeStatus, string> = {
  初拒: "red",
  面拒: "red",
  现届学子: "green",
  仅奖学金: "orange",
  仅不定期: "orange",
  活跃校友: "green.800",
  学友: "green.800",
  退出校友: "gray",
  劝退: "gray",
};

export default function MenteeStatusSelect({
  value: status,
  showAny,
  size,
  onChange,
}: {
  value: MenteeStatus | null | undefined;
  showAny?: boolean;
  size?: string;
  onChange: (v: MenteeStatus | null | undefined) => void;
}) {
  return (
    <Select
      size={size}
      color={status ? status2color[status] : undefined}
      value={
        status === undefined
          ? anyMenteeStatus
          : status === null
            ? nullMenteeStatus
            : status
      }
      onChange={(e) => {
        const v = e.target.value;
        if (v == nullMenteeStatus) onChange(null);
        else if (v == anyMenteeStatus) onChange(undefined);
        else onChange(zMenteeStatus.parse(v));
      }}
    >
      {showAny && <option value={anyMenteeStatus}>{anyMenteeStatus}</option>}
      <option value={nullMenteeStatus}>{nullMenteeStatus}</option>
      {AllMenteeStatuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </Select>
  );
}

export function MenteeStatusSelectCell({
  status,
  onChange,
}: {
  status: MenteeStatus | null;
  onChange: (v: MenteeStatus | null | undefined) => void;
}) {
  return (
    <Td>
      <Wrap minWidth="110px">
        <WrapItem>
          <MenteeStatusSelect
            value={status}
            size="sm"
            onChange={(status) => onChange(status)}
          />
        </WrapItem>
      </Wrap>
    </Td>
  );
}
