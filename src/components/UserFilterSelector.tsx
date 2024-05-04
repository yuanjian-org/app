import React, { useEffect } from 'react';
import { UserFilter } from 'shared/User';
import { Select, WrapItem } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import _ from "lodash";
import { AllMenteeStatuses, MenteeStatus, zMenteeStatus } from 'shared/MenteeStatus';
import MenteeStatusSelect, { ANY_MENTEE_STATUS, NULL_MENTEE_STATUS } from './MenteeStatusSelect';

type BooleanLabelType = "是不是" | "有没有" | "已经";

/**
 * Should be wrapped by a `<Wrap align="center">`
 */
export default function UserFilterSelector({ filter, fixedFilter, onChange }: {
  filter: UserFilter,
  fixedFilter?: UserFilter,
  onChange: (f: UserFilter) => void,
}) {
  const router = useRouter();

  // Parse query parameters
  useEffect(() => {
    const f: UserFilter = fixedFilter ? structuredClone(fixedFilter) : {};
    for (const [k, v] of Object.entries(router.query)) {
      if (k == "hasMenteeApplication") f[k] = v == "true" ? true : false;
      if (k == "isMenteeInterviewee") f[k] = v == "true" ? true : false;
      // `typeof v == "string"` to ignore cases of null and string[].
      if (k == "matchesNameOrEmail" && typeof v == "string") f[k] = v;
      if (k == "menteeStatus") {
        f[k] = v == NULL_MENTEE_STATUS ? null : zMenteeStatus.parse(v);
      }
    }
    if (!_.isEqual(f, filter)) onChange(f);
  }, [filter, fixedFilter, onChange, router]);

  // We rely on url parameter parsing (useEffect above) to invoke onChange().
  const updateUrlParams = ((f: UserFilter) => {
    const query: Record<string, any> = {};
    for (const key of Object.keys(f))  {
      // @ts-expect-error
      query[key] = f[key];
    }
    // router.replace() ignores null-valued keys
    if (query.menteeStatus === null) query.menteeStatus = NULL_MENTEE_STATUS;
    router.replace({ pathname: router.pathname, query });
  });

  const booleanSelect = (field: "hasMenteeApplication" | "isMenteeInterviewee",
    type: BooleanLabelType) =>
  {
    return <BooleanSelect value={filter[field]} type={type} onChange={v => {
      const f = structuredClone(filter);
      if (v == undefined) delete f[field];
      else f[field] = v;
      updateUrlParams(f);
    }} />;
  };

  return <>
    <WrapItem><b>过滤条件：</b></WrapItem>
    <WrapItem>
      <MenteeStatusSelect showAny value={filter.menteeStatus}
        onChange={v => {
          const f = structuredClone(filter);
          if (v === undefined) delete f.menteeStatus;
          else f.menteeStatus = v;
          updateUrlParams(f);
        }
      }/>
    </WrapItem>
    <WrapItem>状态</WrapItem>
    <WrapItem>{booleanSelect("hasMenteeApplication", "已经")}</WrapItem>
    <WrapItem>递交学生申请</WrapItem>
    <WrapItem>{booleanSelect("isMenteeInterviewee", "已经")}</WrapItem>
    <WrapItem>为学生拉面试群</WrapItem>
  </>;
}

function BooleanSelect({ value, type, onChange }: {
  value: boolean | undefined,
  type: BooleanLabelType,
  onChange: (v: boolean | undefined) => void
}) {
  const value2str = (v: boolean | undefined) => v == undefined ? "none" : v ? "yes" : "no";
  const change = (s: string) => onChange(s === "none" ? undefined : s === "yes" ? true : false);

  return <Select value={value2str(value)} onChange={e => change(e.target.value)}>
    <option value='none'>{type == "是不是" ? "是或不是" : type == "已经" ? "已经或尚未" : "有或无"}</option>
    <option value='yes'>{type == "是不是" ? "是" : type == "已经" ? "已经" : "有"}</option>
    <option value='no'>{type == "是不是" ? "不是" : type == "已经" ? "尚未" : "没有"}</option>
  </Select>;
}
