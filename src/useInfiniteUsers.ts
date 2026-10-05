import { trpcNext } from "trpc";
import { useInfiniteScroll } from "components/useInfiniteScroll";

// Helper type to extract input parameter type for trpcNext.users.list.useInfiniteQuery
type UsersListFilter = Omit<
  Parameters<typeof trpcNext.users.list.useInfiniteQuery>[0],
  "limit"
>;

/**
 * Custom hook to encapsulate infinite scroll query logic for user listing.
 */
export function useInfiniteUsers(filter: UsersListFilter, limit = 50) {
  const {
    data: usersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = trpcNext.users.list.useInfiniteQuery(
    {
      limit,
      ...filter,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const users = usersData?.pages.flatMap((page) => page.items);

  useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  return {
    users,
    usersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  };
}
