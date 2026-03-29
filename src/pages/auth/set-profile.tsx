import { useEffect } from "react";
import { useRouter } from "next/router";
import useMe from "useMe";
import PageLoader from "components/PageLoader";
import { parseQueryString } from "shared/strings";
import { setProfileCallbackUrlKey } from "shared/callbackUrl";

export default function SetProfile() {
  const me = useMe();
  const router = useRouter();

  // Get the callback URL, defaulting to the root if not provided.
  const callbackUrl = parseQueryString(router, setProfileCallbackUrlKey) ?? "/";

  useEffect(() => {
    // Check if the user's phone is set.
    // If it is, redirect to the callback URL.
    if (me.phone) {
      void router.replace(callbackUrl);
    }
  }, [me.phone, callbackUrl, router]);

  // If phone is not set, <PostLoginModels /> will be rendered globally
  // by <AppPageContainer /> and will show the <SetPhoneModal /> automatically.
  return <PageLoader loadingText="完成登录..." />;
}
