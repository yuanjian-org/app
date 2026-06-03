import { trpcNext } from "trpc";
import { WhiteLabel } from "shared/WhiteLabel";
import { Features } from "shared/Features";

export function useIsStaticConfigsReady(): boolean {
  return useStaticConfigs()?.data !== undefined;
}

export function useWhiteLabel(): WhiteLabel {
  return useStaticConfigs().data?.whiteLabel || "yuantu";
}

export function useFeatures(): Features {
  return useStaticConfigs().data?.features || {};
}

function useStaticConfigs() {
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
