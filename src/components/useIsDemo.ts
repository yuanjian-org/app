import { trpcNext } from "trpc";

export default function useIsDemo() {
  return trpcNext.globalConfigs.isDemo.useQuery(undefined, {
    // The demo mode status is determined by an environment variable (IS_DEMO)
    // and cannot change without restarting the server. Therefore, it's safe
    // to cache it infinitely during a single browser session to prevent
    // redundant API calls. The React Query cache will naturally be cleared
    // on a full page reload or in a new tab.
    staleTime: Infinity,
    cacheTime: Infinity,
  });
}
