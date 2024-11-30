import React, { useEffect } from 'react';
import { UserFilter } from 'shared/User';
import {
  WrapItem
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import _ from "lodash";
import { zMenteeStatus } from 'shared/MenteeStatus';
import MenteeStatusSelect, { NULL_MENTEE_STATUS } from './MenteeStatusSelect';


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
      // `typeof v == "string"` to ignore cases of null and string[].
      if (k == "matchesNameOrEmail" && typeof v == "string") f[k] = v;
      if (k == "menteeStatus") {
        f[k] = v == NULL_MENTEE_STATUS ? null : zMenteeStatus.parse(v);
      }
    }
    if (!_.isEqual(f, filter)) onChange(f);
  }, [filter, fixedFilter, onChange, router]);

  // We rely on url parameter parsing (useEffect above) to invoke onChange().
  const updateUrlParams = (async (f: UserFilter) => {
    const query: Record<string, any> = {};
    for (const key of Object.keys(f))  {
      // @ts-expect-error
      query[key] = f[key];
    }
    // router.replace() ignores null-valued keys
    if (query.menteeStatus === null) query.menteeStatus = NULL_MENTEE_STATUS;
    await router.replace({ pathname: router.pathname, query });
  });

  return <>
    <WrapItem><b>过滤条件：</b></WrapItem>
    <WrapItem>
      <MenteeStatusSelect showAny value={filter.menteeStatus}
        onChange={async v => {
          const f = structuredClone(filter);
          if (v === undefined) delete f.menteeStatus;
          else f.menteeStatus = v;
          await updateUrlParams(f);
        }
      }/>
    </WrapItem>
    <WrapItem>状态</WrapItem>
  </>;
}
