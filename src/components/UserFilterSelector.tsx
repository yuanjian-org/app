import { useEffect } from "react";
import { UserFilter, zUserFilter } from "shared/UserFilter";
import { Wrap, WrapItem } from "@chakra-ui/react";
import { useRouter } from "next/router";
import _ from "lodash";
import MenteeStatusSelect from "./MenteeStatusSelect";
import UserSelector from "./UserSelector";
import { componentSpacing } from "theme/metrics";
import { FullTextSearchBox } from "./FullTextSearchBox";

/**
 * Should be wrapped by a `<Wrap align="center">`
 */
export default function UserFilterSelector({
  filter,
  fixedFilter,
  onChange,
}: {
  filter: UserFilter;
  fixedFilter?: UserFilter;
  onChange: (f: UserFilter) => void;
}) {
  const router = useRouter();

  // Parse query parameters
  useEffect(() => {
    let f: UserFilter = { ...fixedFilter };

    // Decode from a single 'filter' query param if it exists
    if (typeof router.query.filter === "string") {
      try {
        const decoded = JSON.parse(router.query.filter);
        const parsed = zUserFilter.safeParse(decoded);
        if (parsed.success) {
          f = { ...f, ...parsed.data };
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (!_.isEqual(f, filter)) onChange(f);
  }, [filter, fixedFilter, onChange, router.query]);

  // We rely on url parameter parsing (useEffect above) to invoke onChange().
  const updateUrlParams = async (newFilter: UserFilter) => {
    // Only stringify fields that differ from fixedFilter to minimize URL length
    const diff: Partial<UserFilter> = {};
    for (const key of Object.keys(newFilter) as (keyof UserFilter)[]) {
      if (!_.isEqual(newFilter[key], fixedFilter?.[key])) {
        // @ts-expect-error
        diff[key] = newFilter[key];
      }
    }

    const query: Record<string, string> = {};
    if (Object.keys(diff).length > 0) {
      query.filter = JSON.stringify(diff);
    }

    // Use shallow routing to update URL parameters without re-running data fetching methods (like getServerSideProps)
    await router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  };

  return (
    <Wrap spacing={componentSpacing} align="center">
      {/* <WrapItem><b>过滤条件：</b></WrapItem> */}

      <WrapItem minW="300px">
        <FullTextSearchBox
          value={filter.matchesNameOrEmail ?? ""}
          setValue={(v) =>
            updateUrlParams({
              ...filter,
              matchesNameOrEmail: v ? v : undefined,
            })
          }
        />
      </WrapItem>

      <WrapItem>
        <MenteeStatusSelect
          showAny
          value={filter.menteeStatus}
          onChange={(v) =>
            updateUrlParams({
              ...filter,
              menteeStatus: v,
            })
          }
        />
      </WrapItem>

      <WrapItem>
        <UserSelector
          placeholder="搜索联络人..."
          onSelect={(userIds) =>
            updateUrlParams({
              ...filter,
              pointOfContactId: userIds.length > 0 ? userIds[0] : undefined,
            })
          }
        />
      </WrapItem>
    </Wrap>
  );
}
