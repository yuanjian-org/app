import { trpcNext } from "trpc";

export default function useStaticGlobalConfigs() {
  return trpcNext.globalConfigs.getStatic.useQuery(undefined, {
    // This route only includes configs that never change during runtime,
    // Therefore, it's safe
    // to cache it infinitely during a single browser session to prevent
    // redundant API calls. The React Query cache will naturally be cleared
    // on a full page reload or in a new tab.
    staleTime: Infinity,
    cacheTime: Infinity,
  });
}
