import React, { useEffect } from 'react';
import { UserFilter } from 'shared/User';
import {
  WrapItem
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import _ from "lodash";
import { zMenteeStatus } from 'shared/MenteeStatus';
import MenteeStatusSelect, { nullMenteeStatus } from './MenteeStatusSelect';
import UserSelector from './UserSelector';

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
    const f: UserFilter = { ...fixedFilter };
    for (const [k, v] of Object.entries(router.query)) {
      // `typeof v == "string"` to ignore cases of null and string[].
      if (k == "pointOfContactId" && typeof v == "string") f[k] = v;
      if (k == "menteeStatus") {
        f[k] = v == nullMenteeStatus ? null : zMenteeStatus.parse(v);
      }
    }
    if (!_.isEqual(f, filter)) onChange(f);
  }, [filter, fixedFilter, onChange, router]);

  // We rely on url parameter parsing (useEffect above) to invoke onChange().
  const updateUrlParams = async (filter: UserFilter) => {
    const query: Record<string, any> = {};
    for (const key of Object.keys(filter))  {
      if (filter[key as keyof UserFilter] !== undefined) {
        query[key] = filter[key as keyof UserFilter];
      }
    }
    // router.replace() ignores null-valued keys
    if (query.menteeStatus === null) query.menteeStatus = nullMenteeStatus;
    await router.replace({ pathname: router.pathname, query });
  };

  return <>
    {/* <WrapItem><b>过滤条件：</b></WrapItem> */}

    <WrapItem><b>状态：</b></WrapItem>
    <WrapItem>
      <MenteeStatusSelect showAny value={filter.menteeStatus}
        onChange={v => updateUrlParams({
          ...filter,
          menteeStatus: v,
        })
      }/>
    </WrapItem>

    <WrapItem><b>联络人：</b></WrapItem>
    <WrapItem>
      <UserSelector
        onSelect={userIds => updateUrlParams({
          ...filter,
          pointOfContactId: userIds.length > 0 ? userIds[0] : undefined,
        })
      } />
    </WrapItem>
  </>;
}
